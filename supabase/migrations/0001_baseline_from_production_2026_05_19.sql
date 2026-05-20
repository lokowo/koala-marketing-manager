-- Baseline migration: snapshot of production schema as of 2026-05-19
-- Source: Supabase project geolbgirpkzxrdvozmqw
-- This file is the authoritative reference for the professor-related tables.

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- Table: professors (40 columns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS professors (
  id                          uuid          NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name                        text          NOT NULL,
  university                  text          NOT NULL,
  faculty                     text,
  title                       text,
  position_title              text,
  research_areas              text[]        NOT NULL DEFAULT '{}'::text[],
  email                       text,
  profile_url                 text,
  google_scholar_url          text,
  linkedin_url                text,
  lab_url                     text,
  grant_status                text          NOT NULL DEFAULT 'Pending'::text,
  suitable_student_backgrounds text[]       NOT NULL DEFAULT '{}'::text[],
  potential_rp_topics         text[]        NOT NULL DEFAULT '{}'::text[],
  "references"                text,
  verification_status         text          NOT NULL DEFAULT 'Pending'::text,
  source_candidate_id         text,
  arc_project_ids             text[],
  semantic_scholar_id         text,
  h_index                     integer,
  paper_count                 integer,
  citation_count              integer,
  accepting_students          text,
  data_sources                text[],
  last_synced_at              timestamptz,
  opportunity_score           integer       DEFAULT 0,
  opportunity_breakdown       jsonb,
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz,
  research_embedding          vector(1536),
  email_source                text,
  contributed_by              uuid,
  contributed_at              timestamptz,
  reviewed_by                 uuid,
  reviewed_at                 timestamptz,
  ai_bio_zh                   text,
  ai_bio_en                   text,
  ai_bio_generated_at         timestamptz,
  ai_summary                  text
);

-- ============================================================================
-- Table: papers
-- ============================================================================
CREATE TABLE IF NOT EXISTS papers (
  id                    uuid          NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  professor_id          uuid          REFERENCES professors(id),
  title                 text          NOT NULL,
  year                  integer,
  journal               text,
  citation_count        integer       DEFAULT 0,
  doi                   text,
  semantic_scholar_id   text          UNIQUE,
  semantic_scholar_url  text,
  abstract              text,
  source                text          DEFAULT 'Semantic Scholar'::text,
  last_synced           timestamptz   DEFAULT now(),
  created_at            timestamptz   DEFAULT now(),
  doi_url               text,
  ss_url                text
);

-- ============================================================================
-- Table: grants
-- ============================================================================
CREATE TABLE IF NOT EXISTS grants (
  id                            uuid          NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  grant_name                    text          NOT NULL,
  funding_body                  text          NOT NULL,
  arc_project_id                text,
  year                          text          NOT NULL,
  amount                        text,
  lead_professor                text          NOT NULL,
  lead_professor_id             uuid          REFERENCES professors(id),
  university                    text          NOT NULL,
  industry_partner              text,
  project_title                 text          NOT NULL,
  project_abstract              text,
  keywords                      text[]        NOT NULL DEFAULT '{}'::text[],
  phd_relevance                 text          NOT NULL DEFAULT 'Medium'::text,
  industry_scholarship_potential text         NOT NULL DEFAULT 'Medium'::text,
  reference_url                 text,
  verification_status           text          NOT NULL DEFAULT 'Pending'::text,
  source_candidate_id           text,
  created_at                    timestamptz   NOT NULL DEFAULT now(),
  updated_at                    timestamptz
);

-- ============================================================================
-- Table: saved_professors
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_professors (
  id              uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid,
  professor_id    uuid          REFERENCES professors(id),
  notes           text,
  created_at      timestamptz   DEFAULT now(),
  UNIQUE (user_id, professor_id)
);

-- ============================================================================
-- Table: professor_interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS professor_interactions (
  id                uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid          NOT NULL,
  professor_id      uuid          NOT NULL REFERENCES professors(id),
  interaction_type  text          NOT NULL,
  notes             text,
  created_at        timestamptz   DEFAULT now()
);

-- ============================================================================
-- Indexes: professors
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_professors_accepting        ON professors USING btree (accepting_students);
CREATE INDEX IF NOT EXISTS idx_professors_email_source     ON professors USING btree (email_source);
CREATE INDEX IF NOT EXISTS idx_professors_h_index          ON professors USING btree (h_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_professors_name_trgm        ON professors USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_professors_opportunity_score ON professors USING btree (opportunity_score DESC NULLS LAST);
CREATE UNIQUE INDEX IF NOT EXISTS idx_professors_unique_name_uni ON professors USING btree (name, university);
CREATE INDEX IF NOT EXISTS idx_professors_university       ON professors USING btree (university);
CREATE INDEX IF NOT EXISTS idx_professors_user_contributed ON professors USING btree (verification_status, contributed_at DESC) WHERE (verification_status = 'user_contributed'::text);

-- ============================================================================
-- Indexes: papers
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_papers_professor ON papers USING btree (professor_id);
CREATE INDEX IF NOT EXISTS idx_papers_year      ON papers USING btree (year DESC);

-- ============================================================================
-- Indexes: professor_interactions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_prof_interact_type ON professor_interactions USING btree (interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prof_interact_user ON professor_interactions USING btree (user_id, professor_id);

-- ============================================================================
-- Functions
-- ============================================================================

-- Semantic vector search for professor matching
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

-- Count professor interactions (matches, searches, etc.)
CREATE OR REPLACE FUNCTION get_professor_match_count()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM professor_interactions
  WHERE interaction_type IN ('searched', 'matched', 'email_generated', 'viewed', 'interview_prep');
$$;

-- Full-text + trigram search with pagination
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

-- Category counts for filter chips
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

-- Knowledge base vector search
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid, source_type text, source_title text, content text, similarity double precision
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
