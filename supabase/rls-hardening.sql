-- RLS Hardening Migration
-- Adds Row Level Security to all unprotected tables.
-- supabaseAdmin (service_role) bypasses RLS — API routes are unaffected.

-- ============================================================
-- 1. Admin-only tables: RLS enabled, NO policies = deny all
--    Only service_role (supabaseAdmin) can access.
-- ============================================================

ALTER TABLE IF EXISTS pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sensitive_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_repair_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS publishing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recruitment_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS olive_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. User-scoped tables: users can only access their own rows
-- ============================================================

ALTER TABLE IF EXISTS ai_conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_conversations_self' AND tablename = 'ai_conversations') THEN
    CREATE POLICY "ai_conversations_self" ON ai_conversations
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS outreach_emails ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'outreach_emails_self' AND tablename = 'outreach_emails') THEN
    CREATE POLICY "outreach_emails_self" ON outreach_emails
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS user_credits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_credits_self' AND tablename = 'user_credits') THEN
    CREATE POLICY "user_credits_self" ON user_credits
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS user_achievements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_achievements_self' AND tablename = 'user_achievements') THEN
    CREATE POLICY "user_achievements_self" ON user_achievements
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS daily_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_tasks_self' AND tablename = 'daily_tasks') THEN
    CREATE POLICY "daily_tasks_self" ON daily_tasks
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. Insert-own-data tables: users can insert and read own rows
-- ============================================================

ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_insert_own' AND tablename = 'feedback') THEN
    CREATE POLICY "feedback_insert_own" ON feedback
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_select_own' AND tablename = 'feedback') THEN
    CREATE POLICY "feedback_select_own" ON feedback
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS user_activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_activity_log_insert_own' AND tablename = 'user_activity_log') THEN
    CREATE POLICY "user_activity_log_insert_own" ON user_activity_log
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_activity_log_select_own' AND tablename = 'user_activity_log') THEN
    CREATE POLICY "user_activity_log_select_own" ON user_activity_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS outreach_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'outreach_history_insert_own' AND tablename = 'outreach_history') THEN
    CREATE POLICY "outreach_history_insert_own" ON outreach_history
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'outreach_history_select_own' AND tablename = 'outreach_history') THEN
    CREATE POLICY "outreach_history_select_own" ON outreach_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 4. Public-read tables: anyone authenticated can SELECT
-- ============================================================

ALTER TABLE IF EXISTS professors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'professors_public_read' AND tablename = 'professors') THEN
    CREATE POLICY "professors_public_read" ON professors
      FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS grants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'grants_public_read' AND tablename = 'grants') THEN
    CREATE POLICY "grants_public_read" ON grants
      FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS topics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'topics_public_read' AND tablename = 'topics') THEN
    CREATE POLICY "topics_public_read" ON topics
      FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS papers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'papers_public_read' AND tablename = 'papers') THEN
    CREATE POLICY "papers_public_read" ON papers
      FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE IF EXISTS content_cards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'content_cards_public_read' AND tablename = 'content_cards') THEN
    CREATE POLICY "content_cards_public_read" ON content_cards
      FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================
-- 5. Fix blog_posts: replace overly permissive USING (true) policy
-- ============================================================

DROP POLICY IF EXISTS "blog_posts_admin_all" ON blog_posts;
-- Keep the existing blog_posts_public_read policy for published posts.
-- All write operations now require service_role (supabaseAdmin).
