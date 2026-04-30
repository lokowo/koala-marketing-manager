-- ============================================================
-- Koala PhD — Blog & Automation Tables
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. blog_posts — 博客文章主表
CREATE TABLE IF NOT EXISTS blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_zh        TEXT NOT NULL,
  title_en        TEXT,
  excerpt_zh      TEXT,
  excerpt_en      TEXT,
  content_zh      TEXT NOT NULL,
  content_en      TEXT,
  category        TEXT NOT NULL,
  style           TEXT DEFAULT 'casual',
  tags            TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  image_keywords  TEXT[] DEFAULT '{}',

  -- SEO
  seo_title_zh       TEXT,
  seo_title_en       TEXT,
  seo_description_zh TEXT,
  seo_description_en TEXT,
  seo_keywords_zh    TEXT,
  seo_keywords_en    TEXT,

  -- 统计（可手动调整）
  view_count           INTEGER DEFAULT 0,
  share_count          INTEGER DEFAULT 0,
  read_completion_rate FLOAT   DEFAULT 0,

  -- 发布
  status       TEXT    DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  is_pinned    BOOLEAN DEFAULT false,
  pin_order    INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- 元数据
  reading_time_zh   INTEGER,
  reading_time_en   INTEGER,
  original_language TEXT DEFAULT 'zh',
  news_source       TEXT,
  news_source_url   TEXT,
  news_source_date  DATE,

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status    ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category  ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_pinned    ON blog_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);


-- 2. blog_images — 图片库（封面图去重复用）
CREATE TABLE IF NOT EXISTS blog_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url             TEXT NOT NULL,
  keywords        TEXT[] DEFAULT '{}',
  category        TEXT,
  used_as_cover_by UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);


-- 3. blog_in_article_images — 文内插图
CREATE TABLE IF NOT EXISTS blog_in_article_images (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  url                 TEXT NOT NULL,
  insert_after_heading TEXT,
  alt_zh              TEXT,
  alt_en              TEXT,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);


-- 4. automation_logs — 自动化发布日志
CREATE TABLE IF NOT EXISTS automation_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        TEXT NOT NULL,   -- 'generate' / 'publish' / 'social_sync'
  post_id       UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  platform      TEXT,            -- 'blog' / 'twitter' / 'linkedin' / 'wechat' / 'xiaohongshu'
  status        TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- 5. automation_rules — 自动化规则配置
CREATE TABLE IF NOT EXISTS automation_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type  TEXT NOT NULL,   -- 'auto_generate' / 'auto_publish' / 'social_sync' / 'knowledge_content'
  is_enabled BOOLEAN DEFAULT false,
  config     JSONB   NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
