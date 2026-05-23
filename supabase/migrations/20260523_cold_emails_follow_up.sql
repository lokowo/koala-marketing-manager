-- Add follow-up and status tracking columns to cold_emails
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS reply_received_at TIMESTAMPTZ;
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS follow_up_count INT NOT NULL DEFAULT 0;
ALTER TABLE cold_emails ADD COLUMN IF NOT EXISTS parent_email_id UUID REFERENCES cold_emails(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cold_emails_status ON cold_emails(status);
CREATE INDEX IF NOT EXISTS idx_cold_emails_parent ON cold_emails(parent_email_id);

-- Allow users to update their own cold emails (status, notes, subject, body)
CREATE POLICY "Users update own cold emails" ON cold_emails
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert their own cold emails
CREATE POLICY "Users insert own cold emails" ON cold_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own cold emails
CREATE POLICY "Users delete own cold emails" ON cold_emails
  FOR DELETE USING (auth.uid() = user_id);
