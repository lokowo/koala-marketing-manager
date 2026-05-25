-- ============================================================
-- RLS Audit: 17 tables with RLS enabled but no policies
-- Audit date: 2026-05-25
--
-- Finding: All 17 tables are accessed EXCLUSIVELY via supabaseAdmin
-- (service_role), which bypasses RLS. RLS enabled + no policies =
-- deny-all for anon/authenticated = correct and secure.
--
-- This migration:
-- 1. Documents each table's access pattern (no DDL needed for the 17)
-- 2. Fixes survey_answers dangerous USING(true) UPDATE policy
-- 3. REVOKEs EXECUTE on 3 SECURITY DEFINER functions from anon
-- ============================================================

-- ============================================================
-- SECTION 1: Documentation of 17 service-role-only tables
--
-- These tables have RLS enabled with NO policies. This is intentional.
-- service_role bypasses RLS; anon/authenticated get deny-all.
--
-- email_verifications  — auth register/verify/forgot-password routes (supabaseAdmin)
-- sales_customers      — sales pipeline, registration referral tracking (supabaseAdmin)
-- user_roles           — admin role checks, permission verification (supabaseAdmin)
-- feedback             — AI chat feedback insert + admin stats (inline service_role)
-- admin_user_notes     — admin notes on user profiles (supabaseAdmin)
-- admin_work_logs      — activity logging for admin/sales actions (supabaseAdmin)
-- automation_logs      — unused, reserved for future automation (no code refs)
-- automation_rules     — unused, reserved for future automation (no code refs)
-- blog_images          — unused, blog images managed via storage (no code refs)
-- blog_in_article_images — unused, inline images via storage (no code refs)
-- followup_reminders   — outreach follow-up scheduling (inline service_role)
-- knowledge_chunks     — RAG knowledge base + embeddings (supabaseAdmin)
-- pipeline_runs        — professor sync pipeline execution log (inline service_role)
-- publishing_items     — content publishing tracking (supabaseAdmin)
-- sales_qrcodes        — QR code tracking for sales referrals (supabaseAdmin)
-- sales_weekly_reports  — weekly sales performance reports (supabaseAdmin)
-- sensitive_words      — content filter wordlist (no code refs, admin-managed)
--
-- NO POLICY CHANGES NEEDED — deny-all is correct for these tables.
-- ============================================================

-- Add table comments for future auditors
COMMENT ON TABLE email_verifications IS 'RLS: deny-all (service_role only). Auth verification codes.';
COMMENT ON TABLE sales_customers IS 'RLS: deny-all (service_role only). Sales pipeline customer records.';
COMMENT ON TABLE user_roles IS 'RLS: deny-all (service_role only). Admin/sales role assignments.';
COMMENT ON TABLE feedback IS 'RLS: deny-all (service_role only). AI chat feedback.';
COMMENT ON TABLE admin_user_notes IS 'RLS: deny-all (service_role only). Admin notes on users.';
COMMENT ON TABLE admin_work_logs IS 'RLS: deny-all (service_role only). Admin/sales activity logs.';
COMMENT ON TABLE followup_reminders IS 'RLS: deny-all (service_role only). Outreach follow-up scheduling.';
COMMENT ON TABLE knowledge_chunks IS 'RLS: deny-all (service_role only). RAG knowledge base.';
COMMENT ON TABLE pipeline_runs IS 'RLS: deny-all (service_role only). Professor sync pipeline logs.';
COMMENT ON TABLE publishing_items IS 'RLS: deny-all (service_role only). Content publishing queue.';
COMMENT ON TABLE sales_qrcodes IS 'RLS: deny-all (service_role only). Sales QR code tracking.';
COMMENT ON TABLE sales_weekly_reports IS 'RLS: deny-all (service_role only). Weekly sales reports.';

-- Tables that may not exist yet — use DO block to avoid errors
DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE automation_logs IS ''RLS: deny-all (service_role only). Unused automation logs.''';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE automation_rules IS ''RLS: deny-all (service_role only). Unused automation rules.''';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE blog_images IS ''RLS: deny-all (service_role only). Blog cover images.''';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE blog_in_article_images IS ''RLS: deny-all (service_role only). Blog inline images.''';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'COMMENT ON TABLE sensitive_words IS ''RLS: deny-all (service_role only). Content filter wordlist.''';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ============================================================
-- SECTION 2: Fix survey_answers dangerous UPDATE policy
--
-- Current state: public_update_answers USING(true) allows ANY
-- anon/authenticated user to UPDATE ANY row in survey_answers.
--
-- All survey_answers writes go through supabaseAdmin (service_role)
-- in surveyService.ts. No client-side access exists.
--
-- Fix: Drop the permissive policy. RLS stays enabled, so only
-- service_role can write. This is the correct access pattern.
-- ============================================================

DROP POLICY IF EXISTS "public_update_answers" ON survey_answers;


-- ============================================================
-- SECTION 3: Revoke EXECUTE on SECURITY DEFINER functions from anon
--
-- These functions run with elevated privileges (SECURITY DEFINER)
-- and expose sales/survey data. Anon should not call them directly.
-- All legitimate callers use service_role API routes.
--
-- Must also revoke from PUBLIC (which implicitly grants to anon),
-- then re-grant to authenticated + service_role + postgres.
--
-- get_professor_match_count is left unchanged per requirements
-- (public stat, called from /api/stats/match-count via service_role).
-- ============================================================

-- get_sales_funnel(p_sales_user_id uuid)
REVOKE EXECUTE ON FUNCTION get_sales_funnel(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_sales_funnel(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_sales_funnel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_funnel(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_sales_funnel(uuid) TO postgres;

-- get_survey_analytics_aggregate(p_survey_id uuid)
REVOKE EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_survey_analytics_aggregate(uuid) TO postgres;

-- get_survey_analytics_full(p_survey_id uuid, p_sales_user_id uuid)
REVOKE EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_survey_analytics_full(uuid, uuid) TO postgres;
