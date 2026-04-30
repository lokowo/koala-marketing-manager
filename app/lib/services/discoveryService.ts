import { store } from '../store';
import type { DiscoveryCandidate, CandidateStatus } from '../types';
import { generateMockCandidates } from '../discoveryMockData';
import { createProfessor } from './professorService';
import { createGrant } from './grantService';

export function listCandidates(filters?: {
  university?: string;
  researchField?: string;
  type?: string;
  status?: CandidateStatus;
}): DiscoveryCandidate[] {
  let result = store.discoveryCandidates;
  if (filters?.university && filters.university !== 'All') result = result.filter(c => c.university === filters.university);
  if (filters?.researchField && filters.researchField !== 'All') result = result.filter(c => c.researchField === filters.researchField);
  if (filters?.type && filters.type !== 'All') result = result.filter(c => c.type === filters.type);
  if (filters?.status) result = result.filter(c => c.status === filters.status);
  return result;
}

export function getCandidate(id: string): DiscoveryCandidate | undefined {
  return store.discoveryCandidates.find(c => c.id === id);
}

export function updateCandidateStatus(id: string, status: CandidateStatus): DiscoveryCandidate | null {
  const idx = store.discoveryCandidates.findIndex(c => c.id === id);
  if (idx === -1) return null;
  store.discoveryCandidates[idx] = { ...store.discoveryCandidates[idx], status };
  return store.discoveryCandidates[idx];
}

export async function saveCandidate(id: string): Promise<{ candidate: DiscoveryCandidate; entityId: string } | null> {
  const candidate = store.discoveryCandidates.find(c => c.id === id);
  if (!candidate || candidate.status === 'Rejected') return null;

  let entityId: string;

  if (candidate.type === 'Professor') {
    const prof = await createProfessor({
      name: candidate.title,
      university: candidate.university,
      faculty: '',
      title: '',
      researchAreas: [candidate.researchField],
      email: '',
      profileUrl: candidate.sourceUrl,
      googleScholarUrl: '',
      grantStatus: 'Pending',
      suitableStudentBackgrounds: [],
      potentialRpTopics: [],
      references: candidate.summary,
      verificationStatus: 'Pending',
      sourceCandidateId: candidate.id,
    });
    entityId = prof.id;
  } else if (candidate.type === 'Grant') {
    const grant = await createGrant({
      grantName: candidate.title,
      fundingBody: '',
      year: new Date().getFullYear().toString(),
      amount: '',
      leadProfessor: '',
      university: candidate.university,
      industryPartner: '',
      projectTitle: candidate.title,
      projectAbstract: candidate.summary,
      keywords: [candidate.researchField],
      phdRelevance: 'Medium',
      industryScholarshipPotential: 'Medium',
      referenceUrl: candidate.sourceUrl,
      verificationStatus: 'Pending',
      sourceCandidateId: candidate.id,
    });
    entityId = grant.id;
  } else {
    entityId = crypto.randomUUID();
  }

  const idx = store.discoveryCandidates.findIndex(c => c.id === id);
  store.discoveryCandidates[idx] = { ...store.discoveryCandidates[idx], status: 'Saved', savedEntityId: entityId };
  return { candidate: store.discoveryCandidates[idx], entityId };
}

export function runDiscovery(params: {
  university: string;
  researchField: string;
  sourceType: string;
  resultsPerRun: number;
}): DiscoveryCandidate[] {
  const fresh = generateMockCandidates(
    params.university,
    params.researchField,
    params.sourceType,
    params.resultsPerRun,
  ) as DiscoveryCandidate[];

  const existingIds = new Set(store.discoveryCandidates.map(c => c.id));
  const newCandidates = fresh.filter(c => !existingIds.has(c.id));
  store.discoveryCandidates.push(...newCandidates);

  return fresh;
}
