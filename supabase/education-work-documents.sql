-- Koala PhD — Education History, Work History, User Documents
-- NOTE: This file reflects the PRODUCTION schema as of 2026-05-19.
-- Do NOT run this in production — it is documentation only.

-- ─────────────────────────────────────────────
-- education_history (multiple education entries per user)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS education_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution     TEXT NOT NULL,
  institution_short TEXT,
  degree_type     TEXT NOT NULL,
  degree_name     TEXT,
  major           TEXT,
  major_code      TEXT,
  start_year      INTEGER,
  end_year        INTEGER,
  status          TEXT DEFAULT 'completed',
  gpa             NUMERIC,
  gpa_scale       TEXT,
  country         TEXT,
  city            TEXT,
  sort_order      INTEGER DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS education_history_user_idx ON education_history (user_id);

-- ─────────────────────────────────────────────
-- work_history (multiple work entries per user)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company         TEXT NOT NULL,
  position        TEXT NOT NULL,
  description     TEXT,
  start_year      INTEGER,
  end_year        INTEGER,
  status          TEXT DEFAULT 'completed',
  industry        TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_current      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_history_user_idx ON work_history (user_id);

-- ─────────────────────────────────────────────
-- user_documents (uploaded files with AI parse status)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       INTEGER,
  institution     TEXT,
  ai_parsed       BOOLEAN DEFAULT FALSE,
  ai_summary      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_documents_user_idx ON user_documents (user_id);

-- ─────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────

ALTER TABLE education_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "education_history_self" ON education_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "work_history_self" ON work_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_documents_self" ON user_documents
  FOR ALL USING (auth.uid() = user_id);
