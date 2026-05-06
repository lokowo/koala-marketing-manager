import type { MetadataRoute } from 'next';
import { supabaseAdmin } from './lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://koalaphd.com';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/koala/home`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/koala/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/koala/professors`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/koala/chat`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/koala/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  try {
    const { data: posts } = await db
      .from('blog_posts')
      .select('id, slug, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(500);

    const blogPages: MetadataRoute.Sitemap = (posts || []).map((post: { id: string; slug?: string; published_at?: string; updated_at?: string }) => ({
      url: `${baseUrl}/koala/blog/${post.slug || post.id}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : post.published_at ? new Date(post.published_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...blogPages];
  } catch {
    return staticPages;
  }
}
