import type { Metadata } from 'next';
import { getFeaturedProfessors, countProfessors } from '../../lib/services/professorService';
import { supabaseAdmin } from '../../lib/supabase/server';
import HomeClient from './HomeClient';

export const revalidate = 300;

export const metadata: Metadata = {
  title: '首页 — 澳洲PhD申请AI平台 | Koala PhD',
  description: '覆盖全澳38所大学教授数据库，AI智能导师匹配，一键生成套磁信。免费PhD路径评估、导师推荐、奖学金信息和科研方向深潜。',
  keywords: ['澳洲PhD', '博士申请', '导师匹配', 'AI PhD advisor', '套磁信', '奖学金', '教授推荐'],
  alternates: { canonical: 'https://koalaphd.com/koala/home' },
  openGraph: {
    title: 'Koala PhD — 你的澳洲PhD申请AI平台',
    description: '覆盖全澳38所大学教授，AI导师匹配，一键生成套磁信。',
    url: 'https://koalaphd.com/koala/home',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koala PhD — 澳洲PhD申请AI平台',
    description: '覆盖全澳38所大学教授，AI导师匹配，一键生成套磁信。',
    images: ['/og-image.png'],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CATEGORY_LABELS: Record<string, string> = {
  phd_guide: 'PhD指南',
  application: '申请攻略',
  scholarship: '奖学金',
  visa: '签证攻略',
  supervisor: '导师关系',
  research: '科研方法',
  student_life: '留学生活',
  news: '行业新闻',
  professor_spotlight: '教授推荐',
};

export default async function HomePage() {
  const [featuredResult, profTotal, userCountResult, blogData, postingProfIds] = await Promise.all([
    getFeaturedProfessors(6).catch(() => ({ data: [], labels: {} as Record<string, string> })),
    countProfessors().catch(() => 0),
    (async () => {
      try {
        const { count } = await db
          .from('ai_conversations')
          .select('user_id', { count: 'exact', head: true });
        return count ?? 0;
      } catch { return 0; }
    })(),
    (async () => {
      try {
        const { data } = await db
          .from('professor_postings')
          .select('professor_id')
          .eq('status', 'active');
        return [...new Set((data ?? []).map((r: { professor_id: string }) => r.professor_id))];
      } catch { return []; }
    })(),
    (async () => {
      try {
        const { data: pinned } = await db
          .from('blog_posts')
          .select('id, slug, title_zh, title_en, excerpt_zh, excerpt_en, category, published_at, created_at, view_count')
          .eq('status', 'published')
          .eq('is_pinned', true)
          .order('published_at', { ascending: false })
          .limit(8);
        const posts = pinned || [];
        if (posts.length < 8) {
          const pinnedIds = posts.map((p: Record<string, unknown>) => p.id as string);
          let q = db
            .from('blog_posts')
            .select('id, slug, title_zh, title_en, excerpt_zh, excerpt_en, category, published_at, created_at, view_count')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(8 - posts.length);
          if (pinnedIds.length > 0) {
            q = q.not('id', 'in', `(${pinnedIds.join(',')})`);
          }
          const { data: latest } = await q;
          return [...posts, ...(latest || [])];
        }
        return posts;
      } catch {
        return [];
      }
    })(),
  ]);

  const blogPosts = (blogData as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    slug: (p.slug as string) || undefined,
    tag: CATEGORY_LABELS[p.category as string] || (p.category as string) || '博客',
    date: p.published_at
      ? new Date(p.published_at as string).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
      : p.created_at
        ? new Date(p.created_at as string).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
        : '最近',
    title: (p.title_zh || p.title_en || '无标题') as string,
    excerpt: (p.excerpt_zh || p.excerpt_en || '') as string,
    viewCount: (p.view_count as number) || 0,
  }));

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Koala PhD',
    alternateName: 'Koala Study Advisors',
    url: 'https://koalaphd.com',
    logo: 'https://koalaphd.com/koala-logo.svg',
    image: 'https://koalaphd.com/og-image.png',
    description: 'AI-powered Australian PhD supervisor matching platform. Browse 38 universities, get free professor matching, and generate customized cold emails. 覆盖全澳38所大学导师与学者，一键生成套磁信。',
    email: 'info@koalastudy.net',
    sameAs: [
      'https://www.instagram.com/dr.koalaau',
      'https://www.xiaohongshu.com/user/profile/dr.koalaau',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@koalastudy.net',
      availableLanguage: ['Chinese', 'English'],
    },
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Koala PhD',
    url: 'https://koalaphd.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://koalaphd.com/koala/professors?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HomeClient
        initialProfessors={featuredResult.data}
        initialProfCount={profTotal as number}
        initialUserCount={userCountResult as number}
        initialBlogPosts={blogPosts}
        professorLabels={featuredResult.labels as Record<string, string>}
        postingProfIds={postingProfIds as string[]}
      />
    </>
  );
}
