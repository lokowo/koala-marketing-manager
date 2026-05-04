-- Extended professor profile fields for better matching
-- Run this in Supabase SQL Editor

ALTER TABLE professors ADD COLUMN IF NOT EXISTS supervision_style TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS lab_size TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS chinese_friendly BOOLEAN;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS industry_connections TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS recent_graduates TEXT;
