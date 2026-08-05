-- ============================================================
-- 新闻类文章去重 · 第 3 步之一（正文向量落库 · 仅 DB 层）
-- 日期: 2026-08-05
--
-- 背景:
--   /api/blog/topics 选题闸门此前每次请求都即时对全部非教授文章
--   （title+excerpt）做 embedding 再比对，成本高、每次重复算。
--   本 migration 为 blog_posts 增加两列向量并各建索引：
--     - topic_embedding   : 标题+摘要向量（= 选题闸门比对口径，候选标题↔已有 topic_embedding，同粒度）
--     - content_embedding : 正文全文向量（供整篇级去重/后续用途，及阈值标定 body↔body 对照）
--   均由回填脚本 scripts/backfill-blog-content-embedding-20260805.ts 用
--   text-embedding-3-small(1536 维) 生成写入。维度对齐 app/lib/server/embedding.ts 的 EMBEDDING_DIMS = 1536。
--
-- 执行顺序（重要，DDL 由人工在 Supabase 手动执行）:
--   1) 先执行本文件第 1 段两条 ALTER TABLE 增列；
--   2) 再跑回填脚本写入 topic_embedding 与 content_embedding；
--   3) 数据写入后再执行第 2 段建 ivfflat 索引 —— ivfflat 在建索引时按现有数据
--      训练聚类中心，空表上建索引召回率差。故索引语句注明「回填后执行」。
-- ============================================================

-- 1. 增加两列向量（可空；未回填的行为 NULL，选题闸门会记日志而非静默跳过）
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS topic_embedding vector(1536);

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS content_embedding vector(1536);

COMMENT ON COLUMN blog_posts.topic_embedding IS
  '标题+摘要（title_zh + excerpt_zh）text-embedding-3-small(1536 维) 向量。供 /api/blog/topics 选题查重闸门读库比对（候选标题↔topic_embedding，同粒度，余弦相似度）。由 scripts/backfill-blog-content-embedding-20260805.ts 回填。';

COMMENT ON COLUMN blog_posts.content_embedding IS
  '正文全文 text-embedding-3-small(1536 维) 向量；正文为空时退化用摘要/标题。供整篇级去重与阈值标定（body↔body 对照）。由 scripts/backfill-blog-content-embedding-20260805.ts 回填。';

-- 2. 向量索引（⚠️ 回填数据之后再执行本段）
--    与 knowledge_chunks 保持一致：ivfflat + vector_cosine_ops（选题闸门用余弦相似度）。
--    注：非教授类文章体量很小（约数十篇），顺序扫描亦可，本索引主要为未来增长预留。
--    若已建索引后又批量回填，建议对相应索引 REINDEX 重训聚类。
CREATE INDEX IF NOT EXISTS blog_posts_topic_embedding_idx
  ON blog_posts USING ivfflat (topic_embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS blog_posts_content_embedding_idx
  ON blog_posts USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);
