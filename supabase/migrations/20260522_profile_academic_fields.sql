-- Add structured academic profile fields to user_profiles
-- These support the chat-based profile collection flow

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS research_interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS publications jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS target_preferences jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;
