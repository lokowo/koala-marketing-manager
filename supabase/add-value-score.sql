-- Add value_score column to survey_responses
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS value_score integer;
