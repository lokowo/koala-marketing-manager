import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const UNIVERSITY_GROUPS: Record<string, string[]> = {
  Go8: ['University of Melbourne', 'University of Sydney', 'Australian National University', 'University of Queensland', 'University of New South Wales', 'Monash University', 'University of Western Australia', 'University of Adelaide'],
  ATN: ['University of Technology Sydney', 'RMIT University', 'Curtin University', 'Queensland University of Technology', 'University of South Australia'],
  IRU: ['Griffith University', 'James Cook University', 'La Trobe University', 'Murdoch University', 'Flinders University', 'Charles Darwin University', 'Western Sydney University'],
  RUN: ['University of New England', 'University of Southern Queensland', 'University of the Sunshine Coast', 'Central Queensland University', 'Southern Cross University', 'Federation University'],
};

function classifyUniversity(name: string): string {
  for (const [group, unis] of Object.entries(UNIVERSITY_GROUPS)) {
    if (unis.some(u => name.includes(u))) return group;
  }
  return 'Other';
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const PAGE_SIZE = 1000;

async function fetchAllPaginated(columns: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await db.from('professors').select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) { console.error('[research-landscape] pagination error:', error); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

async function aggregateData() {
  // Get exact total via count
  const { count: total } = await db.from('professors').select('id', { count: 'exact', head: true });
  if (!total || total === 0) {
    return { total: 0, byUniversity: [], groupSummary: {}, topResearchAreas: [], acceptingStudents: { count: 0, rate: 0 }, verifiedCount: 0, dataFreshness: { withPapers: 0, rate: 0 } };
  }

  // Run count queries and paginated fetches in parallel
  // Fetch lightweight columns only — latest_papers is large JSONB, just check non-null via separate query
  const [acceptingRes, verifiedRes, allRows, papersCountRes] = await Promise.all([
    db.from('professors').select('id', { count: 'exact', head: true }).or('accepting_students.eq.yes,accepting_students.eq.likely'),
    db.from('professors').select('id', { count: 'exact', head: true }).eq('is_verified', true),
    fetchAllPaginated('university, research_areas'),
    db.from('professors').select('id', { count: 'exact', head: true }).not('latest_papers', 'is', null),
  ]);

  // University distribution
  const uniCounts = new Map<string, number>();
  for (const p of allRows) {
    const uni = (p.university as string) ?? 'Unknown';
    uniCounts.set(uni, (uniCounts.get(uni) ?? 0) + 1);
  }
  const byUniversity = Array.from(uniCounts.entries())
    .map(([university, count]) => ({ university, group: classifyUniversity(university), count }))
    .sort((a, b) => b.count - a.count);

  // Research areas
  const areaCounts = new Map<string, number>();
  for (const p of allRows) {
    const areas = p.research_areas as string[] | null;
    if (!areas) continue;
    for (const area of areas) {
      if (!area || typeof area !== 'string' || area.trim().length < 3) continue;
      const normalized = area.trim();
      areaCounts.set(normalized, (areaCounts.get(normalized) ?? 0) + 1);
    }
  }
  const topResearchAreas = Array.from(areaCounts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const withPapersCount = papersCountRes.count ?? 0;
  const acceptingCount = acceptingRes.count ?? 0;
  const verifiedCount = verifiedRes.count ?? 0;

  const groupSummary: Record<string, number> = {};
  for (const u of byUniversity) {
    groupSummary[u.group] = (groupSummary[u.group] ?? 0) + u.count;
  }

  return {
    total,
    byUniversity,
    groupSummary,
    topResearchAreas,
    acceptingStudents: { count: acceptingCount, rate: Math.round((acceptingCount / total) * 1000) / 10 },
    verifiedCount,
    dataFreshness: { withPapers: withPapersCount, rate: Math.round((withPapersCount / total) * 1000) / 10 },
    cachedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return Response.json(cache.data, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
      });
    }

    const data = await aggregateData();
    cache = { data, timestamp: Date.now() };

    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('[research-landscape]', error);
    return Response.json({ error: 'Failed to aggregate data' }, { status: 500 });
  }
}
