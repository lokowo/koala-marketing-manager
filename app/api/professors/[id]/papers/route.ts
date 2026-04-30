import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from('papers')
    .select('id, title, year, citation_count, journal, doi, doi_url, ss_url, abstract')
    .eq('professor_id', id)
    .order('citation_count', { ascending: false })
    .limit(10);
  if (error) return Response.json({ papers: [] });
  return Response.json({ papers: data ?? [] });
}
