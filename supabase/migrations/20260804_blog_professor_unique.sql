-- ============================================================
-- 教授文章去重 · 第 1 步（仅 DB 层）
-- 日期: 2026-08-04
--
-- 背景:
--   blog_posts.professor_id 此前无唯一约束，导致同一教授可生成多篇
--   category='professor_spotlight' 文章（Admin 入口无查重、C 端弱查重仅看
--   published，均可绕过）。详见 docs/professor-article-audit.md。
--
-- 本 migration 建立部分唯一索引，从 DB 层兜底：同一 professor_id 在
--   professor_spotlight 分类下最多一篇。professor_id 为空的多教授综述文不受约束。
--
-- 注意:
--   - CREATE INDEX CONCURRENTLY 不能在事务块内执行，需单独运行（本项目通过
--     Supabase MCP execute_sql 单条应用，非 apply_migration 事务包裹）。
--   - 应用前须先清理存量重复行（本次已删除 Bryan Boruff 的重复文
--     id=ada7885f-6799-418c-8145-20e1ed895e7b，保留 view_count 较高的
--     id=b5469fae-9dfa-4878-8537-2965862cba22）。
-- ============================================================

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_blog_posts_prof_unique
ON blog_posts (professor_id)
WHERE professor_id IS NOT NULL AND category = 'professor_spotlight';
