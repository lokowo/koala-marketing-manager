import { listProfessors, countProfessors } from '../../lib/services/professorService';
import { supabaseAdmin } from '../../lib/supabase/server';
import HomeClient from './HomeClient';

export const revalidate = 300;

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
  const [professors, profCount, matchData, blogData] = await Promise.all([
    listProfessors({ limit: 6, sortBy: 'opportunity_score' }).catch(() => []),
    countProfessors({}).catch(() => 0),
    db.from('ai_conversations').select('id', { count: 'exact', head: true }).then((r: { count: number }) => r.count || 0).catch(() => 0),
    db.from('blog_posts').select('id, slug, title_zh, title_en, excerpt_zh, excerpt_en, category, published_at, created_at, view_count').eq('status', 'published').order('published_at', { ascending: false }).limit(2).then((r: { data: Record<string, unknown>[] | null }) => r.data || []).catch(() => []),
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
    '@type': 'Organization',
    name: 'Koala PhD',
    alternateName: 'Koala Study Advisors',
    url: 'https://koalaphd.com',
    logo: 'https://koalaphd.com/koala-logo.svg',
    description: 'AI 智能匹配澳洲 4,200+ 位教授，一键生成套磁信。PhD 申请、奖学金、导师推荐。',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Suite 22/26A Lime St',
      addressLocality: 'Sydney',
      addressRegion: 'NSW',
      postalCode: '2000',
      addressCountry: 'AU',
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
        initialProfessors={professors}
        initialProfCount={profCount}
        initialMatchCount={matchData as number}
        initialBlogPosts={blogPosts}
      />
    </>
  );
}
