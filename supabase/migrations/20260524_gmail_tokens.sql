CREATE TABLE gmail_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  gmail_address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens" ON gmail_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Add Gmail tracking columns to cold_emails
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS sent_via text;
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS gmail_message_id text;
