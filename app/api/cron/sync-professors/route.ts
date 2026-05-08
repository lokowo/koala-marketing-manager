import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    processed: 0,
    updated: 0,
    papersAdded: 0,
    chunksAdded: 0,
    keywordsExtracted: 0,
    errors: [] as string[],
    timestamp: new Date().toISOString(),
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: professors } = await supabase
      .from('professors')
      .select('id, name, university, semantic_scholar_id, research_areas')
      .or(`last_synced_at.is.null,last_synced_at.lt.${sevenDaysAgo}`)
      .limit(10);

    if (!professors || professors.length === 0) {
      return Response.json({ ...results, message: 'No professors to sync' });
    }

    const { searchAuthor, getAuthorPapers } = await import('../../../lib/server/semantic-scholar');
    const { createEmbedding } = await import('../../../lib/server/embedding');

    for (const prof of professors) {
      try {
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
        }

        if (semanticId) {
          await new Promise(r => setTimeout(r, 1100));
          const papers = await getAuthorPapers(semanticId, 10);

          if (papers.length > 0) {
            const rows = papers.map(p => ({
              professor_id: prof.id,
              semantic_scholar_id: p.paperId,
              title: p.title,
              year: p.year ?? null,
              citation_count: p.citationCount ?? 0,
              journal: p.journal?.name ?? null,
              doi: p.externalIds?.DOI ?? null,
              doi_url: p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : null,
              ss_url: p.url ?? null,
              abstract: (p.abstract ?? '').slice(0, 2000),
            }));

            const { error: upsertErr } = await supabase
              .from('papers')
              .upsert(rows, { onConflict: 'semantic_scholar_id' });

            if (!upsertErr) results.papersAdded += papers.length;

            const newPapers = papers.filter(p => p.abstract).slice(0, 5);
            for (const paper of newPapers) {
              const titleKey = `[PAPER] ${paper.title.slice(0, 200)}`;
              const { data: existing } = await supabase
                .from('knowledge_chunks')
                .select('id')
                .eq('source_title', titleKey)
                .limit(1);

              if (existing?.length) continue;

              const text = [
                `Title: ${paper.title}`,
                paper.year ? `Year: ${paper.year}` : '',
                paper.journal?.name ? `Journal: ${paper.journal.name}` : '',
                paper.citationCount ? `Citations: ${paper.citationCount}` : '',
                `Author: ${prof.name}`,
                `Abstract: ${(paper.abstract ?? '').slice(0, 1500)}`,
              ].filter(Boolean).join('\n');

              try {
                const embedding = await createEmbedding(text);
                const { error: chunkErr } = await supabase
                  .from('knowledge_chunks')
                  .insert({ source_type: 'professor_paper', source_title: titleKey, content: text, embedding });
                if (!chunkErr) results.chunksAdded++;
              } catch { /* skip */ }
            }

            const abstracts = papers.filter(p => p.abstract).slice(0, 5);
            if (abstracts.length >= 2) {
              const existingAreas = (prof.research_areas as string[]) ?? [];
              const abstractText = abstracts.map(p => p.title).join(', ');
              const newKeywords = extractSimpleKeywords(abstractText);
              const merged = [...new Set([...existingAreas, ...newKeywords])].slice(0, 15);
              if (merged.length > existingAreas.length) {
                await supabase.from('professors').update({ research_areas: merged }).eq('id', prof.id);
                results.keywordsExtracted++;
              }
            }
          }

          if (!prof.semantic_scholar_id) {
            await supabase
              .from('professors')
              .update({ last_synced_at: new Date().toISOString() })
              .eq('id', prof.id);
          }
        }

        results.processed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`${prof.name}: ${errMsg}`);
      }
    }

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

function extractSimpleKeywords(text: string): string[] {
  const stopwords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'been', 'has', 'have', 'its', 'into', 'not', 'but', 'can', 'will']);
  const words = text.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stopwords.has(w));

  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] ?? 0) + 1;

  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}
