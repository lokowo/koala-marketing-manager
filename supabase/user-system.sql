-- Koala PhD — User System Tables
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- ─────────────────────────────────────────────
-- user_profiles (one row per auth.users row)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name            TEXT,
  email                   TEXT,
  avatar_url              TEXT,
  university              TEXT,
  major                   TEXT,
  degree_level            TEXT CHECK (degree_level IN ('本科在读', '本科毕业', '硕士在读', '硕士毕业', '博士在读')),
  gpa                     DECIMAL(4,2),
  gpa_scale               TEXT CHECK (gpa_scale IN ('4.0', '5.0', '7.0', '100')),
  target_field            TEXT,
  target_universities     TEXT[] DEFAULT '{}',
  english_level           TEXT,
  has_research_experience BOOLEAN DEFAULT FALSE,
  research_description    TEXT,
  has_publications        BOOLEAN DEFAULT FALSE,
  publication_details     TEXT,
  resume_url              TEXT,
  transcript_url          TEXT,
  parsed_data             JSONB,
  file_name               TEXT,
  profile_completeness    INTEGER DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),
  plan_type               TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro', 'elite')),
  credits_remaining       INTEGER NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- saved_professors (bookmarks)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_professors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, professor_id)
);

CREATE INDEX IF NOT EXISTS saved_professors_user_idx ON saved_professors (user_id);

-- ─────────────────────────────────────────────
-- followup_reminders (fix missing table bug)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS followup_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  outreach_email_id UUID REFERENCES outreach_emails(id) ON DELETE CASCADE,
  remind_at        TIMESTAMPTZ NOT NULL,
  message          TEXT,
  sent             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_reminders ENABLE ROW LEVEL SECURITY;

-- user_profiles: users can only see and edit their own profile
CREATE POLICY "user_profiles_self" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- saved_professors: users can only see and edit their own bookmarks
CREATE POLICY "saved_professors_self" ON saved_professors
  FOR ALL USING (auth.uid() = user_id);

-- followup_reminders: users can only see their own
CREATE POLICY "followup_reminders_self" ON followup_reminders
  FOR ALL USING (auth.uid() = user_id);

-- Note: supabaseAdmin (service_role) bypasses RLS — API routes can read/write all rows
