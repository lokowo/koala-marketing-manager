import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const [chunksRes, lastChunkRes] = await Promise.all([
      db.from('knowledge_chunks').select('*', { count: 'exact', head: true }),
      db.from('knowledge_chunks').select('created_at').order('created_at', { ascending: false }).limit(1),
    ]);

    const professorsRes = await db.from('professors').select('*', { count: 'exact', head: true });

    return Response.json({
      totalChunks: chunksRes.count ?? 0,
      professorCount: professorsRes.count ?? 0,
      lastUpdated: lastChunkRes.data?.[0]?.created_at ?? null,
    });
  } catch (error) {
    console.error('[knowledge-stats]', error);
    return Response.json({ totalChunks: 0, professorCount: 0, lastUpdated: null });
  }
}
