import type { Metadata } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;

    let { data: post } = await db
      .from('blog_posts')
      .select('title_zh, title_en, excerpt_zh, excerpt_en, seo_title_zh, seo_description_zh, cover_image_url, published_at, tags, slug')
      .eq('slug', id)
      .eq('status', 'published')
      .maybeSingle();

    if (!post) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        ({ data: post } = await db
          .from('blog_posts')
          .select('title_zh, title_en, excerpt_zh, excerpt_en, seo_title_zh, seo_description_zh, cover_image_url, published_at, tags, slug')
          .eq('id', id)
          .eq('status', 'published')
          .maybeSingle());
      }
    }

    if (!post) return { title: '文章未找到 | Koala PhD' };

    const title = post.seo_title_zh || post.title_zh || post.title_en || '博客文章';
    const description = post.seo_description_zh || post.excerpt_zh || post.excerpt_en || '';
    const image = post.cover_image_url || '/og-image.png';

    const canonical = `https://koalaphd.com/koala/blog/${post.slug || id}`;

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        type: 'article',
        publishedTime: post.published_at,
        authors: ['Koala PhD'],
        images: [{ url: image, width: 1200, height: 630 }],
        tags: post.tags || [],
        url: canonical,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return { title: '博客文章 | Koala PhD' };
  }
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
