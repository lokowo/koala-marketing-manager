-- Brand settings singleton table
CREATE TABLE IF NOT EXISTS brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL DEFAULT 'Koala PhD',
  slogan text NOT NULL DEFAULT 'Koala — 陪你从申请到毕业，每一步都在。',
  logo_url text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT 'info@koalaphd.com',
  wechat_id text NOT NULL DEFAULT 'MissKoalaAu',
  xiaohongshu text NOT NULL DEFAULT 'DrKoalaAU',
  primary_color text NOT NULL DEFAULT '#3b82f6',
  secondary_color text NOT NULL DEFAULT '#c9a96e',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Seed with defaults
INSERT INTO brand_settings (brand_name, slogan, contact_email, wechat_id, xiaohongshu, primary_color, secondary_color)
VALUES ('Koala PhD', 'Koala — 陪你从申请到毕业，每一步都在。', 'info@koalaphd.com', 'MissKoalaAu', 'DrKoalaAU', '#3b82f6', '#c9a96e')
ON CONFLICT DO NOTHING;
