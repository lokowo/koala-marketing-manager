import Anthropic from '@anthropic-ai/sdk';
import { getAuthorPapers, type SemanticPaper } from './semantic-scholar';
import { createEmbedding } from './embedding';
import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ResearchKeywords {
  primary: string[];
  methods: string[];
  applications: string[];
}

interface CitationMetrics {
  totalCitations: number;
  recentPaperCount: number;
  avgCitationsPerPaper: number;
  peakYear: number | null;
  citationTrend: 'rising' | 'stable' | 'declining' | 'unknown';
  topPaperTitle: string | null;
  topPaperCitations: number;
}

interface ResearchProfile {
  keywords: ResearchKeywords;
  citationMetrics: CitationMetrics;
  researchSummary: string;
  activeTopics: string[];
  methodologies: string[];
}

export async function extractResearchKeywords(papers: SemanticPaper[]): Promise<ResearchKeywords> {
  const abstracts = papers
    .filter(p => p.abstract)
    .map(p => `[${p.year}] ${p.title}\n${p.abstract}`)
    .join('\n\n')
    .slice(0, 6000);

  if (!abstracts) return { primary: [], methods: [], applications: [] };

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: [{ type: 'text', text: 'Extract research keywords from paper abstracts. Return ONLY JSON.', cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Extract research keywords from these paper abstracts into three categories.

Papers:
${abstracts}

Return JSON:
{"primary":["top 5-8 research topic keywords"],"methods":["3-5 methodological keywords like 'machine learning', 'survey study', 'randomized control trial'],"applications":["3-5 application domain keywords like 'healthcare', 'climate change', 'urban planning'"]}`,
    }],
  });

  const text = response.content.find(b => b.type === 'text');
  const raw = text?.type === 'text' ? text.text : '{}';
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* ignore */ }
  return { primary: [], methods: [], applications: [] };
}

export function computeCitationMetrics(papers: SemanticPaper[]): CitationMetrics {
  if (papers.length === 0) {
    return {
      totalCitations: 0, recentPaperCount: 0, avgCitationsPerPaper: 0,
      peakYear: null, citationTrend: 'unknown', topPaperTitle: null, topPaperCitations: 0,
    };
  }

  const currentYear = new Date().getFullYear();
  const totalCitations = papers.reduce((s, p) => s + (p.citationCount ?? 0), 0);
  const recentPapers = papers.filter(p => p.year && p.year >= currentYear - 2);
  const sorted = [...papers].sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));

  const yearCitations: Record<number, number> = {};
  for (const p of papers) {
    if (p.year) yearCitations[p.year] = (yearCitations[p.year] ?? 0) + (p.citationCount ?? 0);
  }
  const peakEntry = Object.entries(yearCitations).sort(([, a], [, b]) => b - a)[0];

  let trend: 'rising' | 'stable' | 'declining' | 'unknown' = 'unknown';
  const recent3yr = papers.filter(p => p.year && p.year >= currentYear - 3);
  const older3yr = papers.filter(p => p.year && p.year < currentYear - 3 && p.year >= currentYear - 6);
  if (recent3yr.length >= 2 && older3yr.length >= 2) {
    const recentAvg = recent3yr.reduce((s, p) => s + (p.citationCount ?? 0), 0) / recent3yr.length;
    const olderAvg = older3yr.reduce((s, p) => s + (p.citationCount ?? 0), 0) / older3yr.length;
    if (recentAvg > olderAvg * 1.3) trend = 'rising';
    else if (recentAvg < olderAvg * 0.7) trend = 'declining';
    else trend = 'stable';
  }

  return {
    totalCitations,
    recentPaperCount: recentPapers.length,
    avgCitationsPerPaper: Math.round(totalCitations / papers.length),
    peakYear: peakEntry ? parseInt(peakEntry[0]) : null,
    citationTrend: trend,
    topPaperTitle: sorted[0]?.title ?? null,
    topPaperCitations: sorted[0]?.citationCount ?? 0,
  };
}

export async function generateResearchSummary(
  professorName: string,
  university: string,
  papers: SemanticPaper[],
): Promise<string> {
  const paperList = papers
    .slice(0, 10)
    .map(p => `- "${p.title}" (${p.year}, ${p.citationCount} citations)${p.abstract ? `\n  ${p.abstract.slice(0, 200)}` : ''}`)
    .join('\n');

  if (!paperList) return '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: [{ type: 'text', text: '用中文写一段简洁的学术研究概述，150字以内。', cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `为 ${university} 的 ${professorName} 教授生成研究概述，基于以下论文：\n\n${paperList}\n\n要求：说明主要研究方向、方法论特色、以及近年研究趋势。150字以内。`,
    }],
  });

  const text = response.content.find(b => b.type === 'text');
  return text?.type === 'text' ? text.text.trim() : '';
}

export async function enrichProfessorResearch(professorId: string): Promise<ResearchProfile | null> {
  const { data: prof } = await db
    .from('professors')
    .select('id, name, university, semantic_scholar_id, research_areas')
    .eq('id', professorId)
    .single();

  if (!prof?.semantic_scholar_id) return null;

  const papers = await getAuthorPapers(prof.semantic_scholar_id, 20);
  if (papers.length === 0) return null;

  const [keywords, summary] = await Promise.all([
    extractResearchKeywords(papers),
    generateResearchSummary(prof.name, prof.university, papers),
  ]);

  const metrics = computeCitationMetrics(papers);

  const allKeywords = [...new Set([
    ...keywords.primary,
    ...keywords.applications,
  ])];

  const existingAreas = prof.research_areas ?? [];
  const mergedAreas = [...new Set([...existingAreas, ...allKeywords])].slice(0, 15);

  await db
    .from('professors')
    .update({
      research_areas: mergedAreas,
      references: summary || undefined,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', professorId);

  const newPaperRows = papers.map(p => ({
    professor_id: professorId,
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

  await db.from('papers').upsert(newPaperRows, { onConflict: 'semantic_scholar_id' });

  const chunksToEmbed = papers
    .filter(p => p.abstract)
    .slice(0, 10);

  for (const paper of chunksToEmbed) {
    const titleKey = `[PAPER] ${paper.title.slice(0, 200)}`;
    const { data: existing } = await db
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
      await db.from('knowledge_chunks').insert({
        source_type: 'professor_paper',
        source_title: titleKey,
        content: text,
        embedding,
      });
    } catch { /* skip on error */ }
  }

  return {
    keywords,
    citationMetrics: metrics,
    researchSummary: summary,
    activeTopics: keywords.primary,
    methodologies: keywords.methods,
  };
}
