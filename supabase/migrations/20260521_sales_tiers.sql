-- Sales Tier Rates: commission rates per product per tier
CREATE TABLE IF NOT EXISTS sales_tier_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL,
  product_name text,
  tier text NOT NULL CHECK (tier IN ('standard', 'senior', 'partner')),
  commission_rate numeric(5,4) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(product_type, tier)
);

INSERT INTO sales_tier_rates (product_type, product_name, tier, commission_rate) VALUES
  ('credit_starter', '入门包 50积分', 'standard', 0.15),
  ('credit_starter', '入门包 50积分', 'senior', 0.18),
  ('credit_starter', '入门包 50积分', 'partner', 0.20),
  ('credit_standard', '标准包 120积分', 'standard', 0.18),
  ('credit_standard', '标准包 120积分', 'senior', 0.21),
  ('credit_standard', '标准包 120积分', 'partner', 0.24),
  ('credit_pro', '专业包 280积分', 'standard', 0.20),
  ('credit_pro', '专业包 280积分', 'senior', 0.23),
  ('credit_pro', '专业包 280积分', 'partner', 0.26),
  ('credit_flagship', '旗舰包 800积分', 'standard', 0.20),
  ('credit_flagship', '旗舰包 800积分', 'senior', 0.23),
  ('credit_flagship', '旗舰包 800积分', 'partner', 0.26),
  ('sub_starter', 'Starter 订阅', 'standard', 0.20),
  ('sub_starter', 'Starter 订阅', 'senior', 0.23),
  ('sub_starter', 'Starter 订阅', 'partner', 0.26),
  ('sub_pro', 'Pro 订阅', 'standard', 0.22),
  ('sub_pro', 'Pro 订阅', 'senior', 0.25),
  ('sub_pro', 'Pro 订阅', 'partner', 0.28),
  ('sub_elite', 'Elite 订阅', 'standard', 0.25),
  ('sub_elite', 'Elite 订阅', 'senior', 0.28),
  ('sub_elite', 'Elite 订阅', 'partner', 0.32);

ALTER TABLE sales_tier_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tier_rates_admin_read" ON sales_tier_rates FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "tier_rates_super_admin_write" ON sales_tier_rates FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Sales Tier Rules: promotion thresholds
CREATE TABLE IF NOT EXISTS sales_tier_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE CHECK (tier IN ('standard', 'senior', 'partner')),
  min_registrations integer NOT NULL DEFAULT 0,
  min_commission numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO sales_tier_rules (tier, min_registrations, min_commission, description) VALUES
  ('standard', 0, 0, '默认等级，新加入即为 Standard'),
  ('senior', 50, 500, '累计注册≥50 或 累计佣金≥$500 自动晋级'),
  ('partner', 200, 2000, '累计注册≥200 或 累计佣金≥$2000 自动晋级');

ALTER TABLE sales_tier_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tier_rules_admin_read" ON sales_tier_rules FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "tier_rules_super_admin_write" ON sales_tier_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Ensure sales_agents has tier column
ALTER TABLE sales_agents ADD COLUMN IF NOT EXISTS tier text DEFAULT 'standard';
UPDATE sales_agents SET tier = 'standard' WHERE tier IS NULL OR tier = 'bronze';
