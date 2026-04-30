import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    processed: 0,
    updated: 0,
    errors: [] as string[],
    timestamp: new Date().toISOString(),
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get professors that haven't been synced in 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: professors } = await supabase
      .from('professors')
      .select('id, name, university, semantic_scholar_id')
      .or(`last_synced_at.is.null,last_synced_at.lt.${sevenDaysAgo}`)
      .limit(20); // Batch limit per cron run

    if (!professors || professors.length === 0) {
      return Response.json({ ...results, message: 'No professors to sync' });
    }

    const { searchAuthor } = await import('../../../lib/server/semantic-scholar');

    for (const prof of professors) {
      try {
        // Rate limit: no API key = 1 req/sec
        await new Promise(r => setTimeout(r, 1100));

        let semanticId = prof.semantic_scholar_id;
        if (!semanticId) {
          const author = await searchAuthor(prof.name, prof.university);
          if (author) {
            semanticId = author.authorId;
            await supabase
              .from('professors')
              .update({
                semantic_scholar_id: semanticId,
                h_index: author.hIndex,
                paper_count: author.paperCount,
                citation_count: author.citationCount,
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', prof.id);
            results.updated++;
          }
        } else {
          // Just update sync timestamp if we already have the ID
          await supabase
            .from('professors')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', prof.id);
          results.updated++;
        }
        results.processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`${prof.name}: ${errMsg}`);
      }
    }

    // Log pipeline run
    await supabase.from('pipeline_runs').insert({
      source: 'semantic_scholar',
      status: results.errors.length === 0 ? 'completed' : 'partial',
      professors_added: 0,
      professors_updated: results.updated,
      errors: results.errors,
    });

    return Response.json(results);
  } catch (e) {
    console.error('[Cron sync-professors]', e);
    return Response.json({ error: 'Cron failed', ...results }, { status: 500 });
  }
}
