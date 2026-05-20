-- Koala PhD — Supabase Functions
-- Synced from production 2026-05-19
-- Run AFTER schema.sql in Supabase SQL Editor

-- ─────────────────────────────────────────────
-- pgvector semantic search for RAG engine
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid, source_type text, source_title text, content text, similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT id, source_type, source_title, content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─────────────────────────────────────────────
-- Semantic vector search for professor matching
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_professors_semantic(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.45,
  match_count integer DEFAULT 20,
  uni_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, name text, university text, position_title text,
  h_index integer, paper_count integer, citation_count integer,
  research_areas text[], email text, faculty text,
  opportunity_score integer, grant_status text, similarity double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT p.id, p.name, p.university, p.position_title,
    p.h_index, p.paper_count, p.citation_count, p.research_areas,
    p.email, p.faculty, p.opportunity_score, p.grant_status,
    1 - (p.research_embedding <=> query_embedding) AS similarity
  FROM professors p
  WHERE p.research_embedding IS NOT NULL
    AND p.verification_status = 'Verified'
    AND 1 - (p.research_embedding <=> query_embedding) > match_threshold
    AND (uni_filter IS NULL OR p.university ILIKE '%' || uni_filter || '%')
  ORDER BY p.research_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─────────────────────────────────────────────
-- Count professor interactions (matches, searches, etc.)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_professor_match_count()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM professor_interactions
  WHERE interaction_type IN ('searched', 'matched', 'email_generated', 'viewed', 'interview_prep');
$$;

-- ─────────────────────────────────────────────
-- Full-text + trigram search with pagination
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_professors_v2(
  p_terms text[] DEFAULT NULL,
  p_category_keywords text[] DEFAULT NULL,
  p_university text DEFAULT NULL,
  p_accepting text DEFAULT NULL,
  p_h_index_min integer DEFAULT 0,
  p_sort text DEFAULT 'opportunity_score',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  total_count bigint;
  result_rows jsonb;
BEGIN
  SELECT count(*) INTO total_count
  FROM professors p
  WHERE
    (p_terms IS NULL OR array_length(p_terms, 1) IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p_terms) term
      WHERE NOT (
        similarity(p.name, term) > 0.15
        OR p.name ILIKE '%' || term || '%'
        OR p.university ILIKE '%' || term || '%'
        OR COALESCE(p.faculty, '') ILIKE '%' || term || '%'
        OR array_to_string(COALESCE(p.research_areas, '{}'), ' ') ILIKE '%' || term || '%'
      )
    ))
    AND (p_category_keywords IS NULL OR array_length(p_category_keywords, 1) IS NULL OR EXISTS (
      SELECT 1 FROM unnest(p_category_keywords) kw
      WHERE array_to_string(COALESCE(p.research_areas, '{}'), ' ') ~* ('\m' || kw)
    ))
    AND (p_university IS NULL OR p.university ILIKE '%' || p_university || '%')
    AND (p_accepting IS NULL OR p.accepting_students = p_accepting)
    AND (p_h_index_min IS NULL OR p_h_index_min = 0 OR COALESCE(p.h_index, 0) >= p_h_index_min);

  SELECT COALESCE(jsonb_agg(to_jsonb(sub) - 'research_embedding' - 'email_source' - 'reviewed_by' - 'reviewed_at' - 'ai_bio_zh' - 'ai_bio_en' - 'ai_bio_generated_at'), '[]'::jsonb)
  INTO result_rows
  FROM (
    SELECT p.*
    FROM professors p
    WHERE
      (p_terms IS NULL OR array_length(p_terms, 1) IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p_terms) term
        WHERE NOT (
          similarity(p.name, term) > 0.15
          OR p.name ILIKE '%' || term || '%'
          OR p.university ILIKE '%' || term || '%'
          OR COALESCE(p.faculty, '') ILIKE '%' || term || '%'
          OR array_to_string(COALESCE(p.research_areas, '{}'), ' ') ILIKE '%' || term || '%'
        )
      ))
      AND (p_category_keywords IS NULL OR array_length(p_category_keywords, 1) IS NULL OR EXISTS (
        SELECT 1 FROM unnest(p_category_keywords) kw
        WHERE array_to_string(COALESCE(p.research_areas, '{}'), ' ') ~* ('\m' || kw)
      ))
      AND (p_university IS NULL OR p.university ILIKE '%' || p_university || '%')
      AND (p_accepting IS NULL OR p.accepting_students = p_accepting)
      AND (p_h_index_min IS NULL OR p_h_index_min = 0 OR COALESCE(p.h_index, 0) >= p_h_index_min)
    ORDER BY
      CASE WHEN p.verification_status = 'Verified' THEN 0 ELSE 1 END,
      CASE WHEN p.accepting_students = 'yes' THEN 0 ELSE 1 END,
      CASE p_sort
        WHEN 'h_index' THEN -COALESCE(p.h_index, 0)
        WHEN 'citation_count' THEN -COALESCE(p.citation_count, 0)
        WHEN 'paper_count' THEN -COALESCE(p.paper_count, 0)
        ELSE -COALESCE(p.opportunity_score, 0)
      END,
      CASE WHEN p_terms IS NOT NULL AND array_length(p_terms, 1) > 0
        THEN -similarity(p.name, p_terms[1])
        ELSE 0
      END,
      p.id
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object('data', result_rows, 'total', total_count);
END;
$$;

-- ─────────────────────────────────────────────
-- Category counts for filter chips
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_professor_category_counts()
RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'all',     COUNT(*),
      'health',  COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Cancer|Health|Disease|Clinical|Stroke|Alzheimer|Dementia|Mental Health|Blood Pressure|Diabetes|Obesity|Immune|Immunotherapy|HIV|Nursing|Pharmaceutical|Vaccine|Epidemiology|Public Health|Malaria|Melanoma|Asthma|Oncology|Psychiatric)'),
      'physics', COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Astrophysics|Astronomy|Cosmology|Particle physics|Quantum|Gravitational|Dark Matter|Gamma-ray|Pulsar|Supernova|Galaxy|Stellar|Photonic|Laser|High-Energy|Gravitational Wave|Atomic and Molecular)'),
      'bio',     COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Genomics|Ecology|Genetics|Molecular Biology|Evolution|Phylogenetic|Microbiology|Virology|Biodiversity|Conservation|Plant Water|Plant Stress|Wildlife|Animal Behavior|Epigenetics|DNA|RNA|Protein)'),
      'earth',   COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Geology|Geophysics|Geochemistry|earthquake|tectonic|Climate|Ocean|Atmospheric|Soil|Mineral|Paleoclimatology|Geologic)'),
      'neuro',   COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Neuroscience|Neurology|Brain|Cognitive|Schizophrenia|Depression|Autism|Epilepsy|Neuroimaging|Functional Brain|Neuropharmacology)'),
      'cs',      COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Machine Learning|Artificial Intelligence|Deep Learning|Computer|Neural Network|Data Science|Algorithm|Cybersecurity|Natural Language Processing|Computer Vision|Bioinformatics|Robotics|Software)'),
      'eng',     COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Engineering|Materials Science|Battery|Energy storage|Nanotechnology|Semiconductor|Aerospace|Fiber Laser|Crystallization|X-ray Diffraction|Chemical Physics)'),
      'soc',     COUNT(*) FILTER (WHERE array_to_string(COALESCE(research_areas, '{}'), ' ') ~* '\m(Psychology|Sociology|Education|Law|Politics|Policy|Economics|Business|Finance|Management|Social Science|Anthropology|Linguistics|History|Nutritional)')
    )
    FROM professors
  );
END;
$$;
