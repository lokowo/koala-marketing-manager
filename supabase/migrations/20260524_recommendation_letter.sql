-- Extend generated_documents type CHECK to include recommendation_letter
ALTER TABLE generated_documents
  DROP CONSTRAINT IF EXISTS generated_documents_type_check;

ALTER TABLE generated_documents
  ADD CONSTRAINT generated_documents_type_check
  CHECK (type IN ('research_proposal', 'sop', 'personal_statement', 'recommendation_letter'));

-- Add recommendation letter counter to usage tracking
ALTER TABLE user_usage_tracking
  ADD COLUMN IF NOT EXISTS rec_letters_generated int NOT NULL DEFAULT 0;
