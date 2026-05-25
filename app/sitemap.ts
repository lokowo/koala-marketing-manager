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
    { url: `${baseUrl}/koala/insights`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/koala/chat`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/koala/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/koala/tools`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/koala/tools/niv`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/koala/discover`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];

  try {
    const [{ data: posts }, { data: professors }] = await Promise.all([
      db
        .from('blog_posts')
        .select('id, slug, published_at, updated_at')
        .eq('status', 'published')
        .not('slug', 'is', null)
        .order('published_at', { ascending: false })
        .limit(500),
      db
        .from('professors')
        .select('slug, last_synced_at')
        .eq('verification_status', 'Verified')
        .not('slug', 'is', null)
        .limit(10000),
    ]);

    const blogPages: MetadataRoute.Sitemap = (posts || []).map((post: { id: string; slug?: string; published_at?: string; updated_at?: string }) => ({
      url: `${baseUrl}/koala/blog/${post.slug || post.id}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : post.published_at ? new Date(post.published_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const professorPages: MetadataRoute.Sitemap = (professors || [])
      .filter((prof: { slug?: string }) => prof.slug)
      .map((prof: { slug: string; last_synced_at?: string }) => ({
        url: `${baseUrl}/professor/${prof.slug}`,
        lastModified: prof.last_synced_at ? new Date(prof.last_synced_at) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));

    return [...staticPages, ...professorPages, ...blogPages];
  } catch {
    return staticPages;
  }
}
