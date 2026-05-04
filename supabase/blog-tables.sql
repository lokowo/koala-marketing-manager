-- Blog Posts table for Koala PhD CMS
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_zh TEXT,
  title_en TEXT,
  excerpt_zh TEXT,
  excerpt_en TEXT,
  content_zh TEXT,
  content_en TEXT,
  category TEXT NOT NULL DEFAULT 'phd_guide',
  tags TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  author TEXT DEFAULT 'Koala PhD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  seo_title_zh TEXT,
  seo_title_en TEXT,
  seo_description_zh TEXT,
  seo_description_en TEXT,
  seo_keywords TEXT,
  reading_time INT DEFAULT 5,
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC) WHERE status = 'published';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_blog_posts_updated_at();

-- Public read access for published posts (no auth needed for frontend)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_public_read" ON blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "blog_posts_admin_all" ON blog_posts
  FOR ALL USING (true);
