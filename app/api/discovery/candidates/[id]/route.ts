import type { NextRequest } from 'next/server';
import { getCandidate, updateCandidateStatus, saveCandidate } from '../../../../lib/services/discoveryService';
import type { CandidateStatus } from '../../../../lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const candidate = getCandidate(id);
  if (!candidate) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: candidate });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { status }: { status: CandidateStatus } = await request.json();

  if (status === 'Saved') {
    const result = await saveCandidate(id);
    if (!result) return Response.json({ error: 'Not found or already rejected' }, { status: 404 });
    return Response.json({ data: result.candidate, entityId: result.entityId });
  }

  const candidate = updateCandidateStatus(id, status);
  if (!candidate) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: candidate });
}
