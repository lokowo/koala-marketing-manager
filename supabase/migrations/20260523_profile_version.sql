ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_version integer DEFAULT 1;
