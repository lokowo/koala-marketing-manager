import type { NextRequest } from 'next/server';
import { getContentCard, updateContentCard } from '../../../../lib/services/contentCardService';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const card = await getContentCard(id);
  if (!card) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: card });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json();
  const card = await updateContentCard(id, body);
  if (!card) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ data: card });
}
