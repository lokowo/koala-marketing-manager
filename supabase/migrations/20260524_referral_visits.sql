-- Referral visits tracking for user-to-user referral attribution
CREATE TABLE IF NOT EXISTS referral_visits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code     text NOT NULL,
  referrer_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  landing_page      text,
  visitor_fingerprint text,
  converted         boolean NOT NULL DEFAULT false,
  converted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visited_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_visits_code ON referral_visits(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_visits_referrer ON referral_visits(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_visits_converted ON referral_visits(converted) WHERE converted = true;

ALTER TABLE referral_visits ENABLE ROW LEVEL SECURITY;
-- No public policies — service_role only for analytics
