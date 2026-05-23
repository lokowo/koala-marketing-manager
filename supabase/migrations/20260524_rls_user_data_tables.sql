-- Enable RLS on 5 user data tables
-- All API routes use service_role (bypasses RLS automatically).
-- user_milestones has one browser-client SELECT via OlaAchievements.tsx.

-- 1. cold_emails
ALTER TABLE cold_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cold emails"
  ON cold_emails FOR ALL
  USING (auth.uid() = user_id);

-- 2. user_memories
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memories"
  ON user_memories FOR ALL
  USING (auth.uid() = user_id);

-- 3. user_usage_tracking
ALTER TABLE user_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own usage tracking"
  ON user_usage_tracking FOR ALL
  USING (auth.uid() = user_id);

-- 4. chat_feedback
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat feedback"
  ON chat_feedback FOR ALL
  USING (auth.uid() = user_id);

-- 5. user_milestones
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own milestones"
  ON user_milestones FOR ALL
  USING (auth.uid() = user_id);
