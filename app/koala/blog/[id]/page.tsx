import { notFound } from 'next/navigation';
import { supabaseAdmin } from '../../../lib/supabase/server';
import BlogDetailClient from './BlogDetailClient';

export const revalidate = 1800;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Try slug first (always safe), then UUID if slug misses
  let { data: post } = await db
    .from('blog_posts')
    .select('*')
    .eq('slug', id)
    .eq('status', 'published')
    .maybeSingle();

  if (!post) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      ({ data: post } = await db
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle());
    }
  }

  if (!post) notFound();

  // Increment view count (fire-and-forget)
  db.from('blog_posts')
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq('id', post.id)
    .then(() => {});

  // Fetch related posts
  const { data: relatedRaw } = await db
    .from('blog_posts')
    .select('id, slug, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, category, author, reading_time_zh, published_at, cover_image_url, tags, view_count')
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(3);

  const relatedPosts = relatedRaw ?? [];

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title_zh || post.title_en,
    description: post.excerpt_zh || post.excerpt_en,
    image: post.cover_image_url || 'https://koalaphd.com/og-image.png',
    datePublished: post.published_at,
    ...(post.updated_at && { dateModified: post.updated_at }),
    author: { '@type': 'Organization', name: 'Koala PhD', url: 'https://koalaphd.com' },
    publisher: {
      '@type': 'Organization',
      name: 'Koala PhD',
      logo: { '@type': 'ImageObject', url: 'https://koalaphd.com/og-image.png' },
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: 'https://koalaphd.com' },
      { '@type': 'ListItem', position: 2, name: '博客', item: 'https://koalaphd.com/koala/blog' },
      { '@type': 'ListItem', position: 3, name: post.title_zh || post.title_en },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <BlogDetailClient post={post} relatedPosts={relatedPosts} />
    </>
  );
}
