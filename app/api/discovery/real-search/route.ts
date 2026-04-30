import { NextRequest } from 'next/server';

const SS_BASE = 'https://api.semanticscholar.org/graph/v1';
const OA_BASE = 'https://api.openalex.org';

const AUS_UNIS = [
  'university of sydney', 'usyd', 'unsw', 'university of new south wales',
  'university of melbourne', 'monash', 'australian national university', 'anu',
  'university of queensland', 'uq', 'university of western australia', 'uwa',
  'university of adelaide', 'rmit', 'uts', 'macquarie', 'deakin', 'griffith',
  'curtin', 'latrobe', 'flinders', 'newcastle', 'wollongong', 'qut', 'bond',
];

function isAustralian(affiliation: string): boolean {
  const lower = affiliation.toLowerCase();
  return AUS_UNIS.some(u => lower.includes(u)) || lower.includes('australia');
}

interface SSAuthor {
  authorId: string;
  name: string;
  affiliations?: Array<{ affiliationId: string; name: string }>;
  citationCount?: number;
  hIndex?: number;
  paperCount?: number;
  url?: string;
}

interface OAAuthor {
  id: string;
  display_name: string;
  affiliations?: Array<{ institution: { display_name: string; country_code: string } }>;
  cited_by_count?: number;
  works_count?: number;
  summary_stats?: { h_index: number };
  ids?: { openalex: string };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get('query') ?? '';
  const university = searchParams.get('university') ?? '';

  if (!query) return Response.json({ candidates: [] });

  // Parallel fetch from Semantic Scholar and OpenAlex
  const [ssResult, oaResult] = await Promise.allSettled([
    fetchSemanticScholar(query),
    fetchOpenAlex(query),
  ]);

  const ssCandidates = ssResult.status === 'fulfilled' ? ssResult.value : [];
  const oaCandidates = oaResult.status === 'fulfilled' ? oaResult.value : [];

  // Merge, filtering to Australian universities if specified
  const all = [...ssCandidates, ...oaCandidates];
  const filtered = university && university !== 'All'
    ? all.filter(c => c.university.toLowerCase().includes(university.toLowerCase()))
    : all.filter(c => isAustralian(c.university));

  // Deduplicate by name similarity
  const seen = new Set<string>();
  const unique = filtered.filter(c => {
    const key = c.title.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return Response.json({ candidates: unique });
}

async function fetchSemanticScholar(query: string) {
  const url = `${SS_BASE}/author/search?query=${encodeURIComponent(query)}&limit=8&fields=authorId,name,affiliations,citationCount,hIndex,paperCount,url`;
  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const data = await res.json() as { data?: SSAuthor[] };
  return (data.data ?? []).map((a: SSAuthor) => ({
    id: `ss-${a.authorId}`,
    type: 'Professor' as const,
    title: a.name,
    university: a.affiliations?.[0]?.name ?? '',
    sourceUrl: a.url ?? `https://www.semanticscholar.org/author/${a.authorId}`,
    summary: [
      a.hIndex !== undefined ? `H-index: ${a.hIndex}` : '',
      a.paperCount !== undefined ? `${a.paperCount} 篇论文` : '',
      a.citationCount !== undefined ? `${a.citationCount} 引用` : '',
    ].filter(Boolean).join(' · '),
    confidenceScore: Math.min(95, 55 + Math.min(40, a.hIndex ?? 0)),
    status: 'Pending' as const,
    researchField: query,
    dataSource: 'Semantic Scholar',
  }));
}

async function fetchOpenAlex(query: string) {
  const url = `${OA_BASE}/authors?search=${encodeURIComponent(query)}&per-page=8&filter=last_known_institution.country_code:AU&mailto=info@koalastudyadvisors.net`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const data = await res.json() as { results?: OAAuthor[] };
  return (data.results ?? []).map((a: OAAuthor) => ({
    id: `oa-${a.id.split('/').pop()}`,
    type: 'Professor' as const,
    title: a.display_name,
    university: a.affiliations?.[0]?.institution?.display_name ?? '',
    sourceUrl: a.ids?.openalex ?? `https://openalex.org/authors/${a.id}`,
    summary: [
      a.summary_stats?.h_index !== undefined ? `H-index: ${a.summary_stats.h_index}` : '',
      a.works_count !== undefined ? `${a.works_count} 篇论文` : '',
      a.cited_by_count !== undefined ? `${a.cited_by_count} 引用` : '',
    ].filter(Boolean).join(' · '),
    confidenceScore: Math.min(95, 55 + Math.min(40, a.summary_stats?.h_index ?? 0)),
    status: 'Pending' as const,
    researchField: query,
    dataSource: 'OpenAlex',
  }));
}
