-- Generated documents table (research proposals, SOPs, personal statements)
CREATE TABLE IF NOT EXISTS generated_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL DEFAULT 'research_proposal'
                    CHECK (type IN ('research_proposal', 'sop', 'personal_statement')),
  professor_id    uuid REFERENCES professors(id) ON DELETE SET NULL,
  application_id  uuid REFERENCES applications(id) ON DELETE SET NULL,
  title           text,
  content         jsonb,
  status          text DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  credits_used    int DEFAULT 0,
  version         int DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_user ON generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON generated_documents(user_id, type);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own generated documents"
  ON generated_documents FOR ALL
  USING (auth.uid() = user_id);

-- Add proposals_generated counter to usage tracking
ALTER TABLE user_usage_tracking
  ADD COLUMN IF NOT EXISTS proposals_generated int NOT NULL DEFAULT 0;
