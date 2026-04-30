import type { NextRequest } from 'next/server';
import { listCandidates, runDiscovery } from '../../../lib/services/discoveryService';
import type { CandidateStatus } from '../../../lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const candidates = listCandidates({
    university: searchParams.get('university') ?? undefined,
    researchField: searchParams.get('researchField') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    status: (searchParams.get('status') as CandidateStatus) ?? undefined,
  });
  return Response.json({ data: candidates, total: candidates.length });
}

// POST /api/discovery/candidates — run a new discovery pass
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { university = 'All', researchField = 'All', sourceType = 'All', resultsPerRun = 10 } = body;
  const candidates = runDiscovery({ university, researchField, sourceType, resultsPerRun });
  return Response.json({ data: candidates, total: candidates.length });
}
