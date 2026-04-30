-- Papers table — run in Supabase SQL Editor BEFORE running collect-professors.ts

CREATE TABLE IF NOT EXISTS papers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id        UUID REFERENCES professors(id) ON DELETE CASCADE,
  semantic_scholar_id TEXT UNIQUE,
  title               TEXT NOT NULL,
  year                INTEGER,
  citation_count      INTEGER DEFAULT 0,
  journal             TEXT,
  doi                 TEXT,
  doi_url             TEXT,
  ss_url              TEXT,
  abstract            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS papers_professor_id_idx ON papers (professor_id);
CREATE INDEX IF NOT EXISTS papers_year_idx ON papers (year DESC);
CREATE INDEX IF NOT EXISTS papers_citation_idx ON papers (citation_count DESC);

-- Also add a unique index on professors.semantic_scholar_id for dedup upserts
CREATE UNIQUE INDEX IF NOT EXISTS professors_semantic_scholar_id_idx
  ON professors (semantic_scholar_id)
  WHERE semantic_scholar_id IS NOT NULL;
