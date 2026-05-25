import type { Metadata } from 'next';
import { listProfessors } from '../../lib/services/professorService';
import ProfessorsClient from './ProfessorsClient';

export const revalidate = 600;

export const metadata: Metadata = {
  title: '澳洲 PhD 导师库 — 覆盖全澳 38 所大学 | Koala PhD',
  description: '按研究方向、大学、H-index 筛选澳洲 PhD 导师。覆盖全澳 38 所大学导师与学者，AI 一键匹配最适合你的导师。Browse Australian PhD supervisors by research area, university, and H-index.',
  keywords: ['澳洲PhD导师', 'PhD supervisor database', 'Australian university professors', '博士生导师', 'PhD导师库'],
  alternates: { canonical: 'https://koalaphd.com/koala/professors' },
  openGraph: {
    title: '澳洲 PhD 导师库 — Koala PhD',
    description: '覆盖全澳 38 所大学导师与学者。按研究方向、大学、H-index 智能筛选。',
    url: 'https://koalaphd.com/koala/professors',
  },
};

export default async function ProfessorsPage() {
  const result = await listProfessors({ limit: 20, sortBy: 'opportunity_score' })
    .catch(() => ({ data: [], total: 0 }));

  return (
    <ProfessorsClient
      initialProfessors={result.data}
      initialTotal={result.total}
    />
  );
}
