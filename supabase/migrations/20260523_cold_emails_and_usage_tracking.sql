-- Cold emails table — stores generated outreach emails
CREATE TABLE IF NOT EXISTS cold_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  highlights JSONB DEFAULT '[]'::jsonb,
  match_scores JSONB DEFAULT '[]'::jsonb,
  student_snapshot JSONB,
  professor_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_emails_user ON cold_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_cold_emails_professor ON cold_emails(professor_id);

ALTER TABLE cold_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own cold emails" ON cold_emails
  FOR SELECT USING (auth.uid() = user_id);

-- Usage tracking table — daily rate limiting
CREATE TABLE IF NOT EXISTS user_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_action ON user_usage_tracking(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created ON user_usage_tracking(created_at);

ALTER TABLE user_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own usage" ON user_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Chat feedback table — lightweight post-conversation survey
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id TEXT,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_user ON chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_question ON chat_feedback(question_key);

ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own feedback" ON chat_feedback
  FOR SELECT USING (auth.uid() = user_id);
