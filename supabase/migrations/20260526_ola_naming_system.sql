-- Add naming system columns to ola_user_memory
ALTER TABLE ola_user_memory
  ADD COLUMN IF NOT EXISTS user_preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS ola_nickname TEXT;
