-- Extended user profile fields for comprehensive student matching
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS english_test_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS english_scores JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS strengths TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS career_goal TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_city TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS budget TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS start_semester TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS personality_tags TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language_preference TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_experience TEXT;

-- File management: support multiple files per user
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;
-- files format: [{ "name": "cv.pdf", "url": "...", "type": "resume|transcript|other", "size": 12345, "uploaded_at": "..." }]
