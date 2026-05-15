import { listProfessors } from '../../lib/services/professorService';
import ProfessorsClient from './ProfessorsClient';

export const revalidate = 600;

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
