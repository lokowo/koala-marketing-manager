import type { Metadata } from 'next';
import { listProfessors } from '../../lib/services/professorService';
import ProfessorsClient from './ProfessorsClient';

export const revalidate = 600;

export const metadata: Metadata = {
  title: '澳洲 PhD 导师库 — 覆盖 38 所大学、23,500+ 位教授 | Koala PhD',
  description: '按研究方向、大学、H-index 筛选澳洲 PhD 导师。覆盖澳洲 38 所大学、23,500+ 位教授与研究员，AI 一键匹配最适合你的导师。',
  openGraph: {
    title: '澳洲 PhD 导师库 — Koala PhD',
    description: '覆盖澳洲 38 所大学、23,500+ 位教授与研究员。',
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
