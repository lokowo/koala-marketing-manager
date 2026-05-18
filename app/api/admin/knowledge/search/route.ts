import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';
import { createEmbedding } from '../../../../lib/server/embedding';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { query, threshold = 0.7, limit = 5 } = body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    const clampedThreshold = Math.max(0, Math.min(1, Number(threshold)));
    const clampedLimit = Math.max(1, Math.min(50, Number(limit)));

    const embedding = await createEmbedding(query);

    const { data, error } = await db.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: clampedThreshold,
      match_count: clampedLimit,
    });

    if (error) {
      console.error('[knowledge search]', error);
      return Response.json({ error: 'Search failed' }, { status: 500 });
    }

    return Response.json({
      results: (data ?? []).map((row: { id: string; source_type: string; source_title: string; content: string; similarity: number }) => ({
        id: row.id,
        source_type: row.source_type,
        source_title: row.source_title,
        content: row.content,
        similarity: row.similarity,
      })),
    });
  } catch (error) {
    console.error('[knowledge search]', error);
    return Response.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}
