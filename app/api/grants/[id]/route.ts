import type { NextRequest } from 'next/server';
import { getGrant, updateGrant, deleteGrant } from '../../../lib/services/grantService';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const grant = await getGrant(id);
  if (!grant) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: grant });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json();
  const grant = await updateGrant(id, body);
  if (!grant) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: grant });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const deleted = await deleteGrant(id);
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ success: true });
}
