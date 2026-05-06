import type { Metadata } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: post } = await db
    .from('blog_posts')
    .select('title_zh, title_en, excerpt_zh, excerpt_en, seo_title_zh, seo_description_zh, cover_image_url, published_at, tags, slug')
    .or(`id.eq.${id},slug.eq.${id}`)
    .single();

  if (!post) return { title: '文章未找到' };

  const title = post.seo_title_zh || post.title_zh || post.title_en || '博客文章';
  const description = post.seo_description_zh || post.excerpt_zh || post.excerpt_en || '';
  const image = post.cover_image_url || '/og-image.svg';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at,
      authors: ['Koala PhD'],
      images: [{ url: image, width: 1200, height: 630 }],
      tags: post.tags || [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
