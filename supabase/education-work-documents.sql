-- Koala PhD — Education History, Work History, User Documents
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- ─────────────────────────────────────────────
-- education_history (multiple education entries per user)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS education_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school          TEXT NOT NULL,
  major           TEXT,
  degree          TEXT CHECK (degree IN (
    '高中', '大专', '本科', '硕士', '博士', '博士后', '其他'
  )),
  gpa             DECIMAL(5,2),
  gpa_scale       TEXT CHECK (gpa_scale IN ('4.0', '5.0', '7.0', '100')),
  start_date      TEXT,
  end_date        TEXT,
  is_current       BOOLEAN DEFAULT FALSE,
  description     TEXT,
  source          TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai_parsed')),
  source_document_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS education_history_user_idx ON education_history (user_id);

-- ─────────────────────────────────────────────
-- work_history (multiple work entries per user)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company         TEXT NOT NULL,
  position        TEXT,
  start_date      TEXT,
  end_date        TEXT,
  is_current       BOOLEAN DEFAULT FALSE,
  description     TEXT,
  source          TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai_parsed')),
  source_document_id UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_history_user_idx ON work_history (user_id);

-- ─────────────────────────────────────────────
-- user_documents (uploaded files with AI parse status)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_size       INTEGER NOT NULL,
  storage_path    TEXT NOT NULL,
  public_url      TEXT,
  parse_status    TEXT DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsing', 'done', 'failed')),
  parsed_data     JSONB,
  parse_error     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_documents_user_idx ON user_documents (user_id);

-- ─────────────────────────────────────────────
-- Foreign keys for source_document_id
-- ─────────────────────────────────────────────

ALTER TABLE education_history
  ADD CONSTRAINT fk_education_source_doc
  FOREIGN KEY (source_document_id) REFERENCES user_documents(id) ON DELETE SET NULL;

ALTER TABLE work_history
  ADD CONSTRAINT fk_work_source_doc
  FOREIGN KEY (source_document_id) REFERENCES user_documents(id) ON DELETE SET NULL;

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
