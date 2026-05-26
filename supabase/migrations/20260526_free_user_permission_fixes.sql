-- Free user permission fixes (2026-05-26)
-- 1. Add parse_used column for resume/transcript parse rate limiting
ALTER TABLE user_usage_tracking ADD COLUMN IF NOT EXISTS parse_used integer DEFAULT 0;
