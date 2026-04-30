const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

const PAPER_FIELDS = 'paperId,title,year,citationCount,journal,externalIds,url,abstract,authors';
const AUTHOR_FIELDS = 'authorId,name,affiliations,citationCount,hIndex,paperCount,url';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;
  return headers;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: getHeaders() });
      if (res.status === 429) {
        // Rate limited — wait and retry
        await new Promise(r => setTimeout(r, (i + 1) * 2000));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

export interface SemanticPaper {
  paperId: string;
  title: string;
  year: number;
  citationCount: number;
  journal?: { name: string };
  externalIds?: { DOI?: string };
  url?: string;
  abstract?: string;
  authors?: Array<{ authorId: string; name: string }>;
}

export interface SemanticAuthor {
  authorId: string;
  name: string;
  affiliations: string[];
  citationCount: number;
  hIndex: number;
  paperCount: number;
  url: string;
}

export async function searchPapers(query: string, limit = 15, yearFrom?: number): Promise<SemanticPaper[]> {
  try {
    const yearParam = yearFrom ? `&year=${yearFrom}-` : '';
    const url = `${BASE_URL}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${PAPER_FIELDS}${yearParam}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    console.error('[SemanticScholar] searchPapers failed');
    return [];
  }
}

export async function searchAuthor(name: string, affiliation?: string): Promise<SemanticAuthor | null> {
  try {
    const url = `${BASE_URL}/author/search?query=${encodeURIComponent(name)}&limit=5&fields=${AUTHOR_FIELDS}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return null;
    const data = await res.json();
    const authors: SemanticAuthor[] = data.data ?? [];

    if (!affiliation) return authors[0] ?? null;

    // Verify affiliation matches
    const matched = authors.find(a =>
      a.affiliations?.some(aff =>
        aff.toLowerCase().includes(affiliation.toLowerCase().split(' ')[0])
      )
    );
    return matched ?? null;
  } catch {
    return null;
  }
}

export async function getAuthorPapers(authorId: string, limit = 10): Promise<SemanticPaper[]> {
  try {
    const url = `${BASE_URL}/author/${authorId}/papers?limit=${limit}&fields=${PAPER_FIELDS}&sort=citationCount:desc`;
    const res = await fetchWithRetry(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export function paperToCitation(paper: SemanticPaper) {
  return {
    title: paper.title,
    authors: paper.authors?.map(a => a.name).join(', ') ?? 'Unknown',
    year: paper.year,
    journal: paper.journal?.name ?? '',
    doi: paper.externalIds?.DOI ?? '',
    url: paper.url ?? (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : ''),
  };
}
