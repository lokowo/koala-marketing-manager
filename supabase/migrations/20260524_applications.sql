-- Application tracking table
CREATE TABLE IF NOT EXISTS applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id     uuid NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  university       text,
  stage            text NOT NULL DEFAULT 'saved'
                     CHECK (stage IN ('saved','drafted','sent','replied','preparing','submitted','interview','decided')),
  cold_email_id    uuid REFERENCES cold_emails(id) ON DELETE SET NULL,
  outcome          text CHECK (outcome IN ('offer','rejected','withdrawn')),
  notes            text,
  next_action      text,
  next_action_date date,
  saved_at         timestamptz,
  drafted_at       timestamptz,
  sent_at          timestamptz,
  replied_at       timestamptz,
  preparing_at     timestamptz,
  submitted_at     timestamptz,
  interview_at     timestamptz,
  decided_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, professor_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_applications_professor ON applications(professor_id);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

-- Migrate saved_professors into applications
INSERT INTO applications (user_id, professor_id, university, stage, saved_at, notes, created_at, updated_at)
SELECT
  sp.user_id,
  sp.professor_id,
  p.university,
  'saved',
  sp.created_at,
  sp.notes,
  sp.created_at,
  sp.created_at
FROM saved_professors sp
JOIN professors p ON p.id = sp.professor_id
ON CONFLICT (user_id, professor_id) DO NOTHING;

-- Add application_id to followup_reminders
ALTER TABLE followup_reminders
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES applications(id) ON DELETE SET NULL;
