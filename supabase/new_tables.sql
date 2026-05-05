-- ============================================
-- Koala PhD — 新增表和字段
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. professors 表新增字段
ALTER TABLE professors ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id);
ALTER TABLE professors ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMPTZ;

-- 2. user_profiles 表（用户画像）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  undergraduate_school TEXT,
  undergraduate_major TEXT,
  gpa TEXT,
  graduate_school TEXT,
  graduate_major TEXT,
  research_interests TEXT[] DEFAULT '{}',
  target_universities TEXT[] DEFAULT '{}',
  target_fields TEXT[] DEFAULT '{}',
  english_score TEXT,
  publications TEXT,
  expected_enrollment TEXT,
  visa_status TEXT,
  budget_range TEXT,
  profile_completeness INTEGER DEFAULT 0,
  extracted_from_chat JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. user_activity_log 表（用户行为日志）
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_log(action, created_at DESC);

-- 4. saved_professors 表（收藏教授）
CREATE TABLE IF NOT EXISTS saved_professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, professor_id)
);

-- 5. outreach_history 表（申请信记录）
CREATE TABLE IF NOT EXISTS outreach_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  letter_title TEXT,
  letter_content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. olive_branches 表（教授橄榄枝）
CREATE TABLE IF NOT EXISTS olive_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(professor_id, student_user_id)
);

-- 7. recruitment_posts 表（教授招生信息）
CREATE TABLE IF NOT EXISTS recruitment_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  research_topic TEXT NOT NULL,
  required_background TEXT,
  scholarship_info TEXT,
  positions_available INTEGER DEFAULT 1,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. AI 修复日志表（如果不存在）
CREATE TABLE IF NOT EXISTS ai_repair_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  fields_updated JSONB DEFAULT '{}',
  confidence JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
