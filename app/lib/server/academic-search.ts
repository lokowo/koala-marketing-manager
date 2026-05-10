/**
 * Academic Search Engine — Parallel search across Semantic Scholar + arXiv + OpenAlex
 * Per docs/academic-knowledge-spec.md
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Unified paper type ────────────────────────────────────────────────────────

export interface AcademicPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  abstract: string;
  citations: number;
  doi: string | null;
  doiUrl: string | null;
  openAccessUrl: string | null;
  arxivId: string | null;
  arxivUrl: string | null;
  source: 'semantic_scholar' | 'arxiv' | 'openalex';
  referenceText: string;
  referenceLink: string;
}

export interface AcademicSearchResult {
  papers: AcademicPaper[];
  searchQueries: string[];
  sources: string[];
  totalFound: number;
}

// ─── Keyword extraction ────────────────────────────────────────────────────────

export async function extractSearchKeywords(query: string): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Extract 2-3 concise English academic search queries from this question. Return ONLY a JSON array of strings, no explanation.

Question: "${query}"

Example output: ["zinc anode corrosion seawater battery", "zinc electrode degradation aqueous electrolyte"]`,
      }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]) as string[];
  } catch {}
  // Fallback: use query directly
  return [query.slice(0, 100)];
}

// ─── Semantic Scholar ──────────────────────────────────────────────────────────

async function searchSemanticScholar(keywords: string[], limit = 10, yearFrom = 2022): Promise<AcademicPaper[]> {
  try {
    const query = keywords[0];
    const fields = 'paperId,title,abstract,year,citationCount,journal,externalIds,url,authors,openAccessPdf';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}&year=${yearFrom}-`;

    const headers: HeadersInit = { Accept: 'application/json' };
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      (headers as Record<string, string>)['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
    }

    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as { data?: Array<{
      paperId: string; title: string; abstract?: string; year: number;
      citationCount: number; journal?: { name: string };
      externalIds?: { DOI?: string; ArXiv?: string };
      url?: string; authors?: Array<{ name: string }>;
      openAccessPdf?: { url: string };
    }> };

    return (data.data ?? []).map(p => {
      const doi = p.externalIds?.DOI ?? null;
      const arxivId = p.externalIds?.ArXiv ?? null;
      const openAccessUrl = p.openAccessPdf?.url ?? null;
      const authors = p.authors?.map(a => a.name) ?? [];
      const firstAuthor = authors[0]?.split(' ').pop() ?? 'Unknown';
      return {
        id: `ss_${p.paperId}`,
        title: p.title,
        authors,
        year: p.year,
        journal: p.journal?.name ?? '',
        abstract: p.abstract ?? '',
        citations: p.citationCount ?? 0,
        doi,
        doiUrl: doi ? `https://doi.org/${doi}` : null,
        openAccessUrl,
        arxivId,
        arxivUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : null,
        source: 'semantic_scholar' as const,
        referenceText: `${firstAuthor} et al., ${p.year}${p.journal?.name ? `, ${p.journal.name}` : ''}`,
        referenceLink: openAccessUrl ?? (arxivId ? `https://arxiv.org/abs/${arxivId}` : doi ? `https://doi.org/${doi}` : p.url ?? ''),
      };
    });
  } catch {
    return [];
  }
}

// ─── arXiv ────────────────────────────────────────────────────────────────────

async function searchArxiv(keywords: string[], limit = 5): Promise<AcademicPaper[]> {
  try {
    const query = keywords.map(k => `all:${encodeURIComponent(k)}`).join('+AND+');
    const url = `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=${limit}&sortBy=relevance`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const xml = await resp.text();

    // Parse Atom XML
    const entries = xml.split('<entry>').slice(1);
    return entries.map(entry => {
      const get = (tag: string) => {
        const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? m[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
      };

      const idRaw = get('id');
      const arxivId = idRaw.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '').split('v')[0];
      const title = get('title').replace(/\s+/g, ' ');
      const abstract = get('summary').replace(/\s+/g, ' ');
      const published = get('published');
      const year = published ? parseInt(published.slice(0, 4)) : new Date().getFullYear();

      const authorMatches = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)];
      const authors = authorMatches.map(m => m[1].trim());
      const firstAuthor = authors[0]?.split(', ')[0]?.split(' ').pop() ?? 'Unknown';

      // Find DOI if present
      const doiMatch = entry.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/);
      const doi = doiMatch ? doiMatch[1].trim() : null;

      return {
        id: `arxiv_${arxivId}`,
        title,
        authors,
        year,
        journal: 'arXiv preprint',
        abstract,
        citations: 0, // arXiv doesn't provide citation counts
        doi,
        doiUrl: doi ? `https://doi.org/${doi}` : null,
        openAccessUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        arxivId,
        arxivUrl: `https://arxiv.org/abs/${arxivId}`,
        source: 'arxiv' as const,
        referenceText: `${firstAuthor} et al., ${year}, arXiv:${arxivId}`,
        referenceLink: `https://arxiv.org/abs/${arxivId}`,
      };
    }).filter(p => p.title);
  } catch {
    return [];
  }
}

// ─── OpenAlex ─────────────────────────────────────────────────────────────────

async function searchOpenAlex(keywords: string[], limit = 5, yearFrom = 2022): Promise<AcademicPaper[]> {
  try {
    const query = encodeURIComponent(keywords[0]);
    const filter = `from_publication_date:${yearFrom}-01-01,is_retracted:false`;
    const url = `https://api.openalex.org/works?search=${query}&sort=cited_by_count:desc&per_page=${limit}&filter=${filter}&mailto=info@koalastudy.net`;

    const headers: HeadersInit = { Accept: 'application/json' };
    if (process.env.OPENALEX_API_KEY) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${process.env.OPENALEX_API_KEY}`;
    }

    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data = await resp.json() as { results?: Array<{
      id: string; title: string; publication_year: number;
      cited_by_count: number;
      primary_location?: { source?: { display_name: string } };
      abstract_inverted_index?: Record<string, number[]>;
      doi?: string;
      authorships?: Array<{ author?: { display_name: string } }>;
      open_access?: { oa_url?: string };
      ids?: { arxiv?: string };
    }> };

    return (data.results ?? []).map(w => {
      const doi = w.doi?.replace('https://doi.org/', '') ?? null;
      const arxivUrl = w.ids?.arxiv ?? null;
      const arxivId = arxivUrl ? arxivUrl.replace('https://arxiv.org/abs/', '') : null;
      const openAccessUrl = w.open_access?.oa_url ?? null;
      const authors = w.authorships?.map(a => a.author?.display_name ?? '').filter(Boolean) ?? [];
      const firstAuthor = authors[0]?.split(' ').pop() ?? 'Unknown';
      const journal = w.primary_location?.source?.display_name ?? '';

      // Reconstruct abstract from inverted index
      let abstract = '';
      if (w.abstract_inverted_index) {
        const words: [string, number][] = [];
        for (const [word, positions] of Object.entries(w.abstract_inverted_index)) {
          for (const pos of positions) words.push([word, pos]);
        }
        abstract = words.sort((a, b) => a[1] - b[1]).map(([w]) => w).join(' ');
      }

      return {
        id: `oa_${w.id.split('/').pop()}`,
        title: w.title ?? '',
        authors,
        year: w.publication_year,
        journal,
        abstract,
        citations: w.cited_by_count ?? 0,
        doi,
        doiUrl: doi ? `https://doi.org/${doi}` : null,
        openAccessUrl,
        arxivId,
        arxivUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : null,
        source: 'openalex' as const,
        referenceText: `${firstAuthor} et al., ${w.publication_year}${journal ? `, ${journal}` : ''}`,
        referenceLink: openAccessUrl ?? (arxivId ? `https://arxiv.org/abs/${arxivId}` : doi ? `https://doi.org/${doi}` : ''),
      };
    }).filter(p => p.title);
  } catch {
    return [];
  }
}

// ─── Dedup + Rank ──────────────────────────────────────────────────────────────

function deduplicateByDOI(papers: AcademicPaper[]): AcademicPaper[] {
  const seen = new Set<string>();
  const result: AcademicPaper[] = [];
  for (const p of papers) {
    const key = p.doi ?? p.arxivId ?? `${p.title.toLowerCase().slice(0, 50)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

function rankPapers(papers: AcademicPaper[]): AcademicPaper[] {
  const now = new Date().getFullYear();
  return [...papers].sort((a, b) => {
    // Score = citations * freshness_factor
    const freshnessA = Math.max(0, 1 - (now - a.year) * 0.1);
    const freshnessB = Math.max(0, 1 - (now - b.year) * 0.1);
    const scoreA = a.citations * freshnessA + (a.openAccessUrl ? 5 : 0);
    const scoreB = b.citations * freshnessB + (b.openAccessUrl ? 5 : 0);
    return scoreB - scoreA;
  });
}

// ─── Main search function ──────────────────────────────────────────────────────

export async function searchAcademicSources(
  query: string,
  options: { limit?: number; yearFrom?: number } = {}
): Promise<AcademicSearchResult> {
  const { limit = 15, yearFrom = new Date().getFullYear() - 3 } = options;

  // Step 1: Extract English academic keywords from potentially Chinese query
  const keywords = await extractSearchKeywords(query);

  // Step 2: Parallel search all three sources
  const [semanticResults, arxivResults, openalexResults] = await Promise.all([
    searchSemanticScholar(keywords, Math.ceil(limit * 0.5), yearFrom),
    searchArxiv(keywords, Math.ceil(limit * 0.2)),
    searchOpenAlex(keywords, Math.ceil(limit * 0.3), yearFrom),
  ]);

  const allSources: string[] = [];
  if (semanticResults.length) allSources.push(`Semantic Scholar (${semanticResults.length}篇)`);
  if (arxivResults.length) allSources.push(`arXiv (${arxivResults.length}篇)`);
  if (openalexResults.length) allSources.push(`OpenAlex (${openalexResults.length}篇)`);

  // Step 3: Dedup by DOI
  const merged = deduplicateByDOI([...semanticResults, ...arxivResults, ...openalexResults]);

  // Step 4: Rank
  const ranked = rankPapers(merged);

  return {
    papers: ranked.slice(0, limit),
    searchQueries: keywords,
    sources: allSources,
    totalFound: merged.length,
  };
}

// Helper: format papers for RAG context (sent to Claude as system context)
// fullAbstract=true sends complete abstracts for deeper analysis (research mode)
export function papersToRAGContext(papers: AcademicPaper[], options?: { fullAbstract?: boolean; maxPapers?: number }): string {
  if (!papers.length) return '';
  const { fullAbstract = true, maxPapers = 12 } = options ?? {};
  return '## 实时检索到的学术论文\n\n' + papers.slice(0, maxPapers).map((p, i) => {
    const abstractText = p.abstract
      ? (fullAbstract ? `摘要：${p.abstract}` : `摘要：${p.abstract.slice(0, 400)}...`)
      : '';
    const citationInfo = p.citations > 0 ? `引用数：${p.citations}` : '';
    const doi = p.doiUrl ? `DOI：${p.doiUrl}` : '';
    const details = [abstractText, citationInfo, doi, `链接：${p.referenceLink || 'N/A'}`].filter(Boolean).join('\n');
    return `[${i + 1}] ${p.referenceText}\n标题：${p.title}\n${details}`;
  }).join('\n\n');
}
