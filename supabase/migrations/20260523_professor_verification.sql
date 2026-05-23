-- Professor verification and public profile fields
ALTER TABLE professors
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_email text,
  ADD COLUMN IF NOT EXISTS professor_message text,
  ADD COLUMN IF NOT EXISTS professor_message_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS looking_for text,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS professors_slug_idx ON professors (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS professors_verified_idx ON professors (is_verified) WHERE is_verified = true;
