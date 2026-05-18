import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';
import { createEmbeddingsBatch } from '../../../../lib/server/embedding';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const BATCH_SIZE = 20;
const MAX_TOTAL = 100;

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: missing, error: fetchErr } = await db
      .from('knowledge_chunks')
      .select('id, source_title, content')
      .is('embedding', null)
      .limit(MAX_TOTAL);

    if (fetchErr) {
      return Response.json({ error: 'Failed to query missing embeddings' }, { status: 500 });
    }

    if (!missing || missing.length === 0) {
      return Response.json({ message: 'All chunks already have embeddings', processed: 0, failed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      const texts = batch.map((row: { source_title: string; content: string }) =>
        `${row.source_title}\n${row.content}`
      );

      try {
        const embeddings = await createEmbeddingsBatch(texts);

        for (let j = 0; j < batch.length; j++) {
          const { error: updateErr } = await db
            .from('knowledge_chunks')
            .update({ embedding: embeddings[j] })
            .eq('id', batch[j].id);

          if (updateErr) {
            failed++;
          } else {
            processed++;
          }
        }
      } catch {
        failed += batch.length;
      }
    }

    return Response.json({
      message: `Backfill complete`,
      total_missing: missing.length,
      processed,
      failed,
    });
  } catch (error) {
    console.error('[knowledge backfill]', error);
    return Response.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
