-- User roles table for RBAC
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS: only service_role can read/write (accessed via supabaseAdmin)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON user_roles
  FOR ALL USING (auth.role() = 'service_role');
