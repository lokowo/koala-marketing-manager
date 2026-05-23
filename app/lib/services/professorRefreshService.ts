import { type SupabaseClient } from '@supabase/supabase-js';

const STALE_HOURS = 24;

export async function refreshProfessorData(
  supabase: SupabaseClient,
  professorId: string,
): Promise<void> {
  const { data: prof } = await supabase
    .from('professors')
    .select('last_synced_at, semantic_scholar_id')
    .eq('id', professorId)
    .single();

  if (!prof) return;

  const lastSynced = prof.last_synced_at ? new Date(prof.last_synced_at) : null;
  const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

  if (lastSynced && lastSynced > staleThreshold) return;

  if (!prof.semantic_scholar_id) return;

  try {
    const ssApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    const headers: Record<string, string> = {};
    if (ssApiKey) headers['x-api-key'] = ssApiKey;

    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/author/${prof.semantic_scholar_id}?fields=hIndex,paperCount,citationCount`,
      { headers },
    );

    if (!res.ok) return;

    const data = await res.json();
    const updates: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
    if (data.hIndex != null) updates.h_index = data.hIndex;
    if (data.paperCount != null) updates.paper_count = data.paperCount;
    if (data.citationCount != null) updates.citation_count = data.citationCount;

    await supabase.from('professors').update(updates).eq('id', professorId);

    const papersRes = await fetch(
      `https://api.semanticscholar.org/graph/v1/author/${prof.semantic_scholar_id}/papers?limit=5&fields=title,year,citationCount,journal,externalIds,url,abstract&sort=year:desc`,
      { headers },
    );

    if (papersRes.ok) {
      const papersData = await papersRes.json();
      const papers = papersData.data ?? [];
      for (const p of papers) {
        if (!p.paperId) continue;
        await supabase.from('papers').upsert(
          {
            professor_id: professorId,
            semantic_scholar_id: p.paperId,
            title: p.title ?? 'Untitled',
            year: p.year ?? null,
            citation_count: p.citationCount ?? 0,
            journal: p.journal?.name ?? null,
            doi: p.externalIds?.DOI ?? null,
            doi_url: p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : null,
            ss_url: p.url ?? null,
            abstract: p.abstract ?? null,
          },
          { onConflict: 'semantic_scholar_id' },
        );
      }
    }
  } catch (err) {
    console.error('[professorRefresh]', err);
  }
}
