import { listProfessors, countProfessors } from '../../lib/services/professorService';
import ProfessorsClient from './ProfessorsClient';

export const revalidate = 600;

export default async function ProfessorsPage() {
  const [professors, total] = await Promise.all([
    listProfessors({ limit: 20, sortBy: 'opportunity_score' }).catch(() => []),
    countProfessors({}).catch(() => 0),
  ]);

  return (
    <ProfessorsClient
      initialProfessors={professors}
      initialTotal={total}
    />
  );
}
