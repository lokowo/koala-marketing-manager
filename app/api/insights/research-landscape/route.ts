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

async function aggregateData() {
  const { data: professors } = await db
    .from('professors')
    .select('university, research_areas, accepting_students, is_verified, latest_papers');

  if (!professors || professors.length === 0) {
    return { total: 0, byUniversity: [], topResearchAreas: [], acceptingRate: 0, verifiedCount: 0, dataFreshnessRate: 0 };
  }

  const total = professors.length;

  // University distribution with groups
  const uniCounts = new Map<string, number>();
  for (const p of professors) {
    const uni = p.university ?? 'Unknown';
    uniCounts.set(uni, (uniCounts.get(uni) ?? 0) + 1);
  }

  const byUniversity = Array.from(uniCounts.entries())
    .map(([university, count]) => ({
      university,
      group: classifyUniversity(university),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Research areas — each professor has an array of phrase-level areas
  const areaCounts = new Map<string, number>();
  for (const p of professors) {
    const areas: string[] = p.research_areas ?? [];
    for (const area of areas) {
      if (!area || typeof area !== 'string') continue;
      const normalized = area.trim();
      if (normalized.length < 3) continue;
      areaCounts.set(normalized, (areaCounts.get(normalized) ?? 0) + 1);
    }
  }

  const topResearchAreas = Array.from(areaCounts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Accepting students rate (count 'yes' and 'likely')
  const acceptingCount = professors.filter(
    (p: { accepting_students: string | null }) => p.accepting_students === 'yes' || p.accepting_students === 'likely',
  ).length;
  const acceptingRate = Math.round((acceptingCount / total) * 1000) / 10;

  // Verified count
  const verifiedCount = professors.filter((p: { is_verified: boolean }) => p.is_verified === true).length;

  // Data freshness — professors with latest_papers
  const withPapersCount = professors.filter(
    (p: { latest_papers: unknown }) => p.latest_papers != null && (Array.isArray(p.latest_papers) ? p.latest_papers.length > 0 : true),
  ).length;
  const dataFreshnessRate = Math.round((withPapersCount / total) * 1000) / 10;

  // Group summary
  const groupSummary: Record<string, number> = {};
  for (const u of byUniversity) {
    groupSummary[u.group] = (groupSummary[u.group] ?? 0) + u.count;
  }

  return {
    total,
    byUniversity,
    groupSummary,
    topResearchAreas,
    acceptingStudents: { count: acceptingCount, rate: acceptingRate },
    verifiedCount,
    dataFreshness: { withPapers: withPapersCount, rate: dataFreshnessRate },
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
