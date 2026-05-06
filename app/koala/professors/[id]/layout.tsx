import type { Metadata } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: prof } = await db
    .from('professors')
    .select('name, university, position_title, research_areas, h_index')
    .eq('id', id)
    .single();

  if (!prof) return { title: '教授未找到' };

  const areas = (prof.research_areas || []).slice(0, 3).join('、');
  const title = `${prof.name} — ${prof.university} | 澳洲PhD导师`;
  const description = `${prof.name}，${prof.university} ${prof.position_title || '教授'}。研究方向：${areas}。H-index: ${prof.h_index || '未知'}。`;

  return {
    title,
    description,
    openGraph: {
      title: `${prof.name} — ${prof.university}`,
      description: `研究方向：${areas}`,
    },
  };
}

export default function ProfessorDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
