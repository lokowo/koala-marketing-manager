-- Koala PhD — Credits System
-- ⚠️ Run this manually in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- This adds credit transactions, referral codes, and extends user_profiles.

-- ─────────────────────────────────────────────
-- credit_transactions — every credit change is logged
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);

-- ─────────────────────────────────────────────
-- referral_codes — each user gets one invite code
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_code ON referral_codes(code);

-- ─────────────────────────────────────────────
-- Extend user_profiles for credits system
-- ─────────────────────────────────────────────

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_daily_credit TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- Update default credits from 1 to 30 for new users
-- (existing users keep their current balance)
-- ─────────────────────────────────────────────

ALTER TABLE user_profiles ALTER COLUMN credits_remaining SET DEFAULT 30;

-- ─────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users see own referrals" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);
