import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { enrichProfessorResearch } from '../../../lib/server/research-analysis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const { professorIds, mode } = await req.json();

    let ids: string[] = professorIds ?? [];

    if (mode === 'stale') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await db
        .from('professors')
        .select('id')
        .not('semantic_scholar_id', 'is', null)
        .or(`last_synced_at.is.null,last_synced_at.lt.${sevenDaysAgo}`)
        .limit(10);
      ids = (data ?? []).map((p: { id: string }) => p.id);
    } else if (mode === 'top') {
      const { data } = await db
        .from('professors')
        .select('id')
        .not('semantic_scholar_id', 'is', null)
        .order('opportunity_score', { ascending: false })
        .limit(10);
      ids = (data ?? []).map((p: { id: string }) => p.id);
    }

    if (ids.length === 0) {
      return Response.json({ message: 'No professors to enrich', results: [] });
    }

    const results: Array<{ id: string; status: string; keywords?: string[] }> = [];

    for (const id of ids.slice(0, 10)) {
      try {
        const profile = await enrichProfessorResearch(id);
        if (profile) {
          results.push({ id, status: 'enriched', keywords: profile.keywords.primary });
        } else {
          results.push({ id, status: 'skipped' });
        }
      } catch (e) {
        results.push({ id, status: `error: ${(e as Error).message}` });
      }
      await new Promise(r => setTimeout(r, 1200));
    }

    return Response.json({ enriched: results.filter(r => r.status === 'enriched').length, total: results.length, results });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/research-enrich POST]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
