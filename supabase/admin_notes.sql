-- Admin notes per C-end user
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_user_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_notes_user_id ON admin_user_notes(user_id);

-- Optional: admin_status column on user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS admin_status TEXT
    CHECK (admin_status IN ('active', 'follow_up', 'converted', 'churned'))
    DEFAULT NULL;
