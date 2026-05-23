import { supabaseAdmin } from '../../../lib/supabase/server';
import { refreshProfessorData } from '../../../lib/services/professorRefreshService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const BATCH_SIZE = 20;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = { refreshed: 0, failed: 0, skipped: 0 };

  try {
    const staleDate = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

    // Priority A: professors with outreach emails (user-engaged) and stale data
    const { data: engagedIds } = await db
      .from('outreach_emails')
      .select('professor_id');
    const uniqueEngagedIds = [...new Set((engagedIds ?? []).map((r: { professor_id: string }) => r.professor_id))];

    let engagedProfs: { id: string }[] = [];
    if (uniqueEngagedIds.length > 0) {
      const { data } = await db
        .from('professors')
        .select('id')
        .in('id', uniqueEngagedIds)
        .or(`last_synced_at.is.null,last_synced_at.lt.${staleDate}`)
        .limit(BATCH_SIZE);
      engagedProfs = data ?? [];
    }

    // Priority B: high opportunity_score professors
    const remaining = BATCH_SIZE - engagedProfs.length;
    let highOppProfs: { id: string }[] = [];
    if (remaining > 0) {
      const excludeIds = engagedProfs.map(p => p.id);
      let query = db
        .from('professors')
        .select('id')
        .gt('opportunity_score', 70)
        .or(`last_synced_at.is.null,last_synced_at.lt.${staleDate}`)
        .order('opportunity_score', { ascending: false })
        .limit(remaining);
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      const { data } = await query;
      highOppProfs = data ?? [];
    }

    // Priority C: accepting_students = 'yes'
    const remaining2 = BATCH_SIZE - engagedProfs.length - highOppProfs.length;
    let acceptingProfs: { id: string }[] = [];
    if (remaining2 > 0) {
      const excludeIds = [...engagedProfs, ...highOppProfs].map(p => p.id);
      let query = db
        .from('professors')
        .select('id')
        .eq('accepting_students', 'yes')
        .or(`last_synced_at.is.null,last_synced_at.lt.${staleDate}`)
        .limit(remaining2);
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      const { data } = await query;
      acceptingProfs = data ?? [];
    }

    const allProfs = [...engagedProfs, ...highOppProfs, ...acceptingProfs];

    if (allProfs.length === 0) {
      return Response.json({ ...stats, message: 'No professors need refresh' });
    }

    for (const prof of allProfs) {
      try {
        await refreshProfessorData(db, prof.id);
        stats.refreshed++;
      } catch (err) {
        console.error(`[cron/refresh-professors] Failed ${prof.id}:`, err);
        stats.failed++;
      }
      // Semantic Scholar rate limit: 1 req/sec without key, 10 req/sec with key
      await new Promise(r => setTimeout(r, 1100));
    }

    return Response.json(stats);
  } catch (error) {
    console.error('[cron/refresh-professors]', error);
    return Response.json({ error: 'Cron failed', ...stats }, { status: 500 });
  }
}
