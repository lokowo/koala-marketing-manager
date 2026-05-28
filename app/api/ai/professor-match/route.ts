import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { createEmbedding } from '../../../lib/server/embedding';
import type { Professor } from '../../../lib/types';
import type { Database } from '../../../lib/database.types';

type ProfessorRow = Database['public']['Tables']['professors']['Row'];

interface MatchScores {
  research_fit: number;
  opportunity: number;
  publication: number;
  student_fit: number;
  availability: number;
  total: number;
}

interface MatchedProfessor {
  id: string;
  name: string;
  university: string;
  faculty: string;
  position_title: string | null;
  research_areas: string[];
  accepting_students: string;
  h_index: number | null;
  paper_count: number | null;
  ai_bio_zh: string | null;
  profile_url: string | null;
  google_scholar_url: string | null;
  scores: MatchScores;
  latest_papers: Array<{ title: string; journal: string | null; year: number | null; doi_url: string | null; citation_count: number }>;
}

const WEIGHTS = {
  research_fit: 0.35,
  opportunity: 0.2,
  publication: 0.15,
  student_fit: 0.2,
  availability: 0.1,
};

function computeKeywordOverlap(researchAreas: string[], interest: string): number {
  const interestWords = new Set(
    interest.toLowerCase().split(/[\s,;，；]+/).filter(w => w.length >= 2)
  );
  if (interestWords.size === 0) return 0;

  const areasText = researchAreas.join(' ').toLowerCase();
  let hits = 0;
  for (const word of interestWords) {
    if (areasText.includes(word)) hits++;
  }
  return Math.min(5, (hits / interestWords.size) * 5);
}

function computeScores(
  row: { similarity?: number; opportunity_score?: number | null; h_index?: number | null; research_areas?: string[] | null; accepting_students?: string | null },
  interest: string,
): MatchScores {
  const similarity = row.similarity ?? 0.5;
  const research_fit = Math.min(5, similarity * 5);

  const oppScore = row.opportunity_score ?? 0;
  const opportunity = Math.min(5, oppScore / 20);

  const hIdx = row.h_index ?? 0;
  const publication = Math.min(5, hIdx / 10);

  const student_fit = computeKeywordOverlap(row.research_areas ?? [], interest);

  const accepting = row.accepting_students;
  const availability = accepting === 'yes' ? 5 : accepting === 'likely' ? 4 : accepting === 'maybe' ? 3 : 1;

  const total = +(
    research_fit * WEIGHTS.research_fit +
    opportunity * WEIGHTS.opportunity +
    publication * WEIGHTS.publication +
    student_fit * WEIGHTS.student_fit +
    availability * WEIGHTS.availability
  ).toFixed(2);

  return {
    research_fit: +research_fit.toFixed(2),
    opportunity: +opportunity.toFixed(2),
    publication: +publication.toFixed(2),
    student_fit: +student_fit.toFixed(2),
    availability,
    total: +total.toFixed(2),
  };
}

async function fetchLatestPapers(professorIds: string[]) {
  if (professorIds.length === 0) return {};
  const { data } = await (supabaseAdmin as ReturnType<typeof import('@supabase/supabase-js').createClient>)
    .from('papers')
    .select('professor_id, title, journal, year, doi_url, citation_count')
    .in('professor_id', professorIds)
    .order('year', { ascending: false })
    .limit(professorIds.length * 5);

  const map: Record<string, Array<{ title: string; journal: string | null; year: number | null; doi_url: string | null; citation_count: number }>> = {};
  for (const row of (data ?? []) as Array<{ professor_id: string; title: string; journal: string | null; year: number | null; doi_url: string | null; citation_count: number }>) {
    if (!map[row.professor_id]) map[row.professor_id] = [];
    if (map[row.professor_id].length < 3) {
      map[row.professor_id].push({
        title: row.title,
        journal: row.journal,
        year: row.year,
        doi_url: row.doi_url,
        citation_count: row.citation_count,
      });
    }
  }
  return map;
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const body = await req.json() as { interest: string; background?: string; limit?: number };
    const { interest, background } = body;
    const limit = Math.min(body.limit ?? 5, 10);

    if (!interest || interest.trim().length < 2) {
      return Response.json({ error: 'interest is required (min 2 chars)' }, { status: 400 });
    }

    const queryText = background
      ? `Research interests: ${interest}. Background: ${background}`
      : `Research interests: ${interest}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type SemanticRow = ProfessorRow & { similarity: number };
    let candidates: SemanticRow[] = [];

    // Try semantic vector search
    try {
      const embedding = await createEmbedding(queryText);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any).rpc('match_professors_semantic', {
        query_embedding: embedding,
        match_threshold: 0.4,
        match_count: 20,
      });
      if (!error && data?.length > 0) {
        candidates = data as SemanticRow[];
      }
    } catch (e) {
      console.error('[professor-match] Semantic search failed:', e);
    }

    // Fallback to keyword search if vector search returned nothing
    if (candidates.length === 0) {
      const keywords = interest.split(/[\s,;，；]+/).map(k => k.trim()).filter(k => k.length >= 2);
      if (keywords.length > 0) {
        const orCondition = keywords.map(k => `research_areas.cs.{${k}}`).join(',');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabaseAdmin as any)
          .from('professors')
          .select('*')
          .eq('verification_status', 'Verified')
          .order('opportunity_score', { ascending: false, nullsFirst: false })
          .limit(50);

        const { data: kwData } = await q;
        const filtered = (kwData ?? []).filter((row: ProfessorRow) => {
          const areasText = (row.research_areas ?? []).join(' ').toLowerCase();
          return keywords.some(k => areasText.includes(k.toLowerCase()));
        });

        candidates = filtered.map((row: ProfessorRow) => ({
          ...row,
          similarity: 0.5,
        }));
      }
    }

    if (candidates.length === 0) {
      return Response.json({ professors: [], query: interest });
    }

    // Score and rank
    const scored = candidates.map(row => ({
      row,
      scores: computeScores(row, interest),
    }));
    scored.sort((a, b) => b.scores.total - a.scores.total);
    const top = scored.slice(0, limit);

    // Fetch latest papers for the top results
    const topIds = top.map(t => t.row.id);
    const papersMap = await fetchLatestPapers(topIds);

    const professors: MatchedProfessor[] = top.map(({ row, scores }) => ({
      id: row.id,
      name: row.name,
      university: row.university,
      faculty: row.faculty ?? '',
      position_title: row.position_title ?? null,
      research_areas: row.research_areas ?? [],
      accepting_students: row.accepting_students ?? 'unknown',
      h_index: row.h_index ?? null,
      paper_count: row.paper_count ?? null,
      ai_bio_zh: (row as Record<string, unknown>).ai_bio_zh as string | null ?? null,
      profile_url: row.profile_url ?? null,
      google_scholar_url: row.google_scholar_url ?? null,
      scores,
      latest_papers: papersMap[row.id] ?? [],
    }));

    return Response.json({ professors, query: interest });
  } catch (e) {
    console.error('[professor-match]', e);
    return Response.json({ error: 'Professor matching failed' }, { status: 500 });
  }
}
