-- Email verification codes table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  code        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('email_verify', 'password_reset')),
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, type)
);

CREATE INDEX IF NOT EXISTS email_verifications_email_idx ON email_verifications (email);
CREATE INDEX IF NOT EXISTS email_verifications_expires_idx ON email_verifications (expires_at);

-- Add email_verified column to user_profiles if not exists
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
