import type { Metadata } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: prof } = await db
    .from('professors')
    .select('name, university, position_title, research_areas, h_index, slug, verification_status')
    .eq('id', id)
    .single();

  if (!prof) return { title: '教授未找到' };

  const areas = (prof.research_areas || []).slice(0, 3).join('、');
  const title = `${prof.name} — ${prof.university} | 澳洲PhD导师`;
  const description = `${prof.name}，${prof.university} ${prof.position_title || '教授'}。研究方向：${areas}。H-index: ${prof.h_index || '未知'}。查看论文、研究方向和联系方式。`;

  return {
    title,
    description,
    openGraph: {
      title: `${prof.name} — ${prof.university}`,
      description: `研究方向：${areas}`,
      type: 'profile',
      url: `https://www.koalaphd.com/koala/professors/${id}`,
    },
    twitter: {
      card: 'summary',
      title: `${prof.name} — ${prof.university}`,
      description: `研究方向：${areas}`,
    },
    alternates: {
      // 仅当公开页 /professor/{slug} 确实会渲染(有 slug 且 verification_status='Verified')时才
      // 跨指向它做 SEO 合并；否则自指向当前真实详情页，避免 canonical 指向 404。
      canonical: (prof.slug && prof.verification_status === 'Verified')
        ? `https://www.koalaphd.com/professor/${prof.slug}`
        : `https://www.koalaphd.com/koala/professors/${id}`,
    },
  };
}

export default async function ProfessorDetailLayout({ params, children }: { params: Promise<{ id: string }>; children: React.ReactNode }) {
  const { id } = await params;

  const { data: prof } = await db
    .from('professors')
    .select('name')
    .eq('id', id)
    .single();

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: 'https://www.koalaphd.com' },
      { '@type': 'ListItem', position: 2, name: '教授', item: 'https://www.koalaphd.com/koala/professors' },
      ...(prof ? [{ '@type': 'ListItem', position: 3, name: prof.name }] : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {children}
    </>
  );
}
