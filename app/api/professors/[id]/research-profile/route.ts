import { supabaseAdmin } from '../../../../lib/supabase/server';
import { enrichProfessorResearch, computeCitationMetrics } from '../../../../lib/server/research-analysis';
import { getAuthorPapers } from '../../../../lib/server/semantic-scholar';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data: prof, error } = await db
      .from('professors')
      .select('id, name, university, semantic_scholar_id, research_areas, h_index, paper_count, citation_count, references, last_synced_at')
      .eq('id', id)
      .single();

    if (error || !prof) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    const { data: papers } = await db
      .from('papers')
      .select('title, year, citation_count, journal, abstract')
      .eq('professor_id', id)
      .order('citation_count', { ascending: false })
      .limit(20);

    const citationMetrics = computeCitationMetrics(
      (papers ?? []).map((p: { title: string; year: number; citation_count: number; journal: string; abstract: string }) => ({
        paperId: '',
        title: p.title,
        year: p.year,
        citationCount: p.citation_count,
        journal: p.journal ? { name: p.journal } : undefined,
        abstract: p.abstract,
      })),
    );

    const yearDistribution: Record<number, number> = {};
    for (const p of papers ?? []) {
      if (p.year) yearDistribution[p.year] = (yearDistribution[p.year] ?? 0) + 1;
    }

    return Response.json({
      professor: {
        id: prof.id,
        name: prof.name,
        university: prof.university,
        researchAreas: prof.research_areas ?? [],
        hIndex: prof.h_index,
        paperCount: prof.paper_count,
        citationCount: prof.citation_count,
        researchSummary: prof.references,
        lastSynced: prof.last_synced_at,
      },
      citationMetrics,
      yearDistribution,
      papers: (papers ?? []).slice(0, 10).map((p: { title: string; year: number; citation_count: number; journal: string }) => ({
        title: p.title,
        year: p.year,
        citations: p.citation_count,
        journal: p.journal,
      })),
    });
  } catch (e) {
    console.error('[research-profile GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { data: prof } = await db
      .from('professors')
      .select('id, semantic_scholar_id')
      .eq('id', id)
      .single();

    if (!prof) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    if (!prof.semantic_scholar_id) {
      return Response.json({ error: 'No Semantic Scholar ID — run sync first' }, { status: 400 });
    }

    const profile = await enrichProfessorResearch(id);
    if (!profile) {
      return Response.json({ error: 'Could not enrich — no papers found' }, { status: 404 });
    }

    return Response.json({ success: true, profile });
  } catch (e) {
    console.error('[research-profile POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
