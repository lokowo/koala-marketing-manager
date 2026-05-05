/**
 * Koala Professor Collector v2.0
 * Expanded scope: Professor / Associate Professor / Senior Lecturer / Lecturer /
 *                 Research Fellow / Senior Research Fellow / Postdoctoral Fellow
 *
 * Usage:
 *   npx tsx scripts/collect-professors.ts                  (Go8 only, ~400/uni)
 *   npx tsx scripts/collect-professors.ts --all            (all 22 universities)
 *   npx tsx scripts/collect-professors.ts --uni=UNSW,USYD  (specific universities)
 *   npx tsx scripts/collect-professors.ts --dry-run        (no DB writes)
 *   npx tsx scripts/collect-professors.ts --skip-existing  (skip already in DB)
 */

// ─── Env loader ───────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const { readFileSync } = require('fs') as typeof import('fs');
    const { resolve } = require('path') as typeof import('path');
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.trim().match(/^([^=#\s][^=]*)=(.*)$/);
      if (m) (process.env as Record<string, string | undefined>)[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}
loadEnv();

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const SS_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Missing Supabase env vars'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('❌ Missing ANTHROPIC_API_KEY'); process.exit(1); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY) as any;
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

const DRY_RUN = process.argv.includes('--dry-run');
const ALL_UNIS = process.argv.includes('--all');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const UNI_FILTER = process.argv.find(a => a.startsWith('--uni='))?.split('=')[1]?.split(',') ?? null;

// ─── University list ──────────────────────────────────────────────────────────

// Group of Eight (Go8) — Australia's research-intensive universities
const GO8_UNIVERSITIES = [
  { name: 'Australian National University',    short: 'ANU',     ror: '019wvm592' },
  { name: 'University of Melbourne',           short: 'UniMelb', ror: '01ej9dk98' },
  { name: 'University of Sydney',              short: 'USYD',    ror: '0384j8v12' },
  { name: 'UNSW Sydney',                       short: 'UNSW',    ror: '03r8z3t63' },
  { name: 'University of Queensland',          short: 'UQ',      ror: '00rqy9422' },
  { name: 'Monash University',                 short: 'Monash',  ror: '02bfwt286' },
  { name: 'University of Western Australia',   short: 'UWA',     ror: '047272k79' },
  { name: 'University of Adelaide',            short: 'UAdel',   ror: '00892tw58' },
];

// Other major Australian universities with strong PhD programs
const OTHER_UNIVERSITIES = [
  { name: 'University of Technology Sydney',   short: 'UTS',     ror: '03f0f6041' },
  { name: 'RMIT University',                   short: 'RMIT',    ror: '04ttjf776' },
  { name: 'Macquarie University',              short: 'Macquarie', ror: '01sf06y89' },
  { name: 'Queensland University of Technology', short: 'QUT',   ror: '01s7t9s60' },
  { name: 'Deakin University',                 short: 'Deakin',  ror: '02czsnj07' },
  { name: 'Griffith University',               short: 'Griffith', ror: '02sc3r913' },
  { name: 'La Trobe University',               short: 'LaTrobe', ror: '01n1mj285' },
  { name: 'University of Newcastle',           short: 'UNewcastle', ror: '04hfmf780' },
  { name: 'University of Wollongong',          short: 'UoW',     ror: '00dn4t786' },
  { name: 'Flinders University',               short: 'Flinders', ror: '01wxp0s13' },
  { name: 'Curtin University',                 short: 'Curtin',  ror: '02n415q13' },
  { name: 'James Cook University',             short: 'JCU',     ror: '02b7n1v41' },
  { name: 'Swinburne University of Technology', short: 'Swinburne', ror: '031rekg67' },
  { name: 'Western Sydney University',         short: 'WSU',     ror: '03t52dk35' },
];

let UNIVERSITIES = ALL_UNIS
  ? [...GO8_UNIVERSITIES, ...OTHER_UNIVERSITIES]
  : GO8_UNIVERSITIES;

if (UNI_FILTER) {
  UNIVERSITIES = [...GO8_UNIVERSITIES, ...OTHER_UNIVERSITIES].filter(u =>
    UNI_FILTER.some(f => u.short.toLowerCase() === f.toLowerCase() || u.name.toLowerCase().includes(f.toLowerCase()))
  );
}

// ─── Collection parameters ────────────────────────────────────────────────────

const MIN_H_INDEX = 3;           // Capture Lecturers and early Research Fellows
const MIN_WORKS_COUNT = 5;       // Must have at least 5 publications
const AUTHORS_PER_PAGE = 200;    // OpenAlex max per page
const PAGES_PER_UNI = 3;         // 3 pages × 200 = up to 600 per university

// ─── Rate limiting ────────────────────────────────────────────────────────────

const SS_DELAY_MS = SS_API_KEY ? 1100 : 1200; // 1 req/s with key (API limit)
let lastSSCall = 0;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function ssDelay() {
  const now = Date.now();
  const elapsed = now - lastSSCall;
  if (elapsed < SS_DELAY_MS) await sleep(SS_DELAY_MS - elapsed);
  lastSSCall = Date.now();
}

// ─── OpenAlex ────────────────────────────────────────────────────────────────

interface OAAuthor {
  id: string;
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats: { h_index: number; i10_index: number };
  last_known_institutions: Array<{ display_name: string; ror: string; country_code: string }>;
  topics: Array<{ display_name: string; score: number; subfield?: { display_name: string } }>;
  ids: { openalex: string; orcid?: string };
}

async function fetchOAAuthors(ror: string): Promise<OAAuthor[]> {
  const results: OAAuthor[] = [];

  for (let page = 1; page <= PAGES_PER_UNI; page++) {
    const url = new URL('https://api.openalex.org/authors');
    url.searchParams.set('filter', `last_known_institutions.ror:https://ror.org/${ror}`);
    url.searchParams.set('select', 'id,display_name,works_count,cited_by_count,summary_stats,last_known_institutions,topics,ids');
    url.searchParams.set('sort', 'cited_by_count:desc');
    url.searchParams.set('per-page', String(AUTHORS_PER_PAGE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('mailto', 'info@koalaphd.com');

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
      if (!res.ok) { console.error(`  OA error ${res.status}`); break; }
      const data = await res.json() as { results: OAAuthor[]; meta: { count: number; per_page: number } };

      if (page === 1) {
        console.log(`  OpenAlex: ${data.meta?.count ?? '?'} total authors`);
      }

      const batch = data.results ?? [];
      results.push(...batch);

      // Stop if we got fewer than a full page (no more results)
      if (batch.length < AUTHORS_PER_PAGE) break;

      // Also stop if we've hit authors below our threshold (sorted by citations)
      const lastH = batch[batch.length - 1]?.summary_stats?.h_index ?? 0;
      if (lastH < MIN_H_INDEX) break;

      await sleep(200); // Polite delay between pages
    } catch (e) {
      console.error(`  OA page ${page} error: ${e}`);
      break;
    }
  }

  return results;
}

// ─── Semantic Scholar ─────────────────────────────────────────────────────────

interface SSAuthor {
  authorId: string;
  name: string;
  affiliations: string[];
  citationCount: number;
  hIndex: number;
  paperCount: number;
  url: string;
}

interface SSPaper {
  paperId: string;
  title: string;
  year: number;
  citationCount: number;
  journal?: { name: string };
  externalIds?: { DOI?: string };
  url?: string;
  abstract?: string;
}

function ssHeaders(): HeadersInit {
  return SS_API_KEY ? { 'x-api-key': SS_API_KEY } : {};
}

async function searchSSAuthor(name: string, uniName: string): Promise<SSAuthor | null> {
  await ssDelay();
  const url = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(name)}&fields=authorId,name,affiliations,citationCount,hIndex,paperCount,url&limit=5`;
  try {
    const res = await fetch(url, { headers: ssHeaders(), signal: AbortSignal.timeout(10000) });
    if (res.status === 429) { await sleep(5000); return null; }
    if (!res.ok) return null;
    const data = await res.json() as { data: SSAuthor[] };
    const candidates = data.data ?? [];
    const uniLower = uniName.toLowerCase();
    const lastName = name.toLowerCase().split(/\s+/).pop() ?? '';
    for (const c of candidates) {
      const nameOk = c.name.toLowerCase().includes(lastName);
      const affOk = c.affiliations.some(a => uniLower.split(/\s+/).some(p => p.length > 3 && a.toLowerCase().includes(p)));
      if (nameOk && affOk) return c;
    }
    for (const c of candidates) {
      if (c.name.toLowerCase().includes(lastName)) return c;
    }
    return null;
  } catch { return null; }
}

async function fetchSSPapers(authorId: string): Promise<SSPaper[]> {
  await ssDelay();
  const url = `https://api.semanticscholar.org/graph/v1/author/${authorId}/papers?fields=paperId,title,year,citationCount,journal,externalIds,url,abstract&limit=5&sort=citationCount:desc`;
  try {
    const res = await fetch(url, { headers: ssHeaders(), signal: AbortSignal.timeout(10000) });
    if (res.status === 429) { await sleep(5000); return []; }
    if (!res.ok) return [];
    const data = await res.json() as { data: SSPaper[] };
    return data.data ?? [];
  } catch { return []; }
}

// ─── Position title inference ─────────────────────────────────────────────────

type PositionTitle =
  | 'Professor'
  | 'Associate Professor'
  | 'Senior Lecturer'
  | 'Lecturer'
  | 'Senior Research Fellow'
  | 'Research Fellow'
  | 'Postdoctoral Fellow';

function inferPositionTitle(hIndex: number, worksCount: number): PositionTitle {
  // Australian academic levels (approximate H-index mapping)
  if (hIndex >= 35) return 'Professor';               // Level E
  if (hIndex >= 22) return 'Associate Professor';     // Level D
  if (hIndex >= 14) return 'Senior Lecturer';         // Level C+
  if (hIndex >= 8)  return 'Lecturer';                // Level B+
  if (hIndex >= 5)  return 'Research Fellow';         // Level B ECR
  if (worksCount >= 10) return 'Research Fellow';     // Active researcher
  return 'Postdoctoral Fellow';                       // Early career
}

// ─── Claude enrichment ────────────────────────────────────────────────────────

interface EnrichedData {
  research_tags: string[];
  research_summary_cn: string;
  position_title: PositionTitle;
}

async function claudeEnrich(params: {
  name: string;
  university: string;
  topics: string[];
  paperTitles: string[];
  hIndex: number;
  citationCount: number;
  worksCount: number;
}): Promise<EnrichedData> {
  const prompt = `以下是一位澳洲大学学术人员的信息，请生成结构化中文摘要。

姓名: ${params.name}
大学: ${params.university}
H-Index: ${params.hIndex}（引用量: ${params.citationCount}，发表量: ${params.worksCount}）
研究方向（英文）: ${params.topics.slice(0, 6).join(', ') || '未知'}
代表论文: ${params.paperTitles.slice(0, 3).join(' / ') || '暂无'}

职称参考（H-index / 澳洲学术级别）:
- ≥35 → Professor（Level E）
- 22-34 → Associate Professor（Level D）
- 14-21 → Senior Lecturer（Level C）
- 8-13 → Lecturer（Level B 中高段）
- 5-7 → Research Fellow（Level B 早期）
- 3-4 且发表量≥10 → Research Fellow
- 3-4 且发表量<10 → Postdoctoral Fellow
- <3 → Postdoctoral Fellow

请返回 JSON（不要代码块，不要额外文字）：
{"research_tags":["中文标签1","中文标签2","中文标签3"],"research_summary_cn":"80-100字中文摘要","position_title":"Professor或Associate Professor或Senior Lecturer或Lecturer或Senior Research Fellow或Research Fellow或Postdoctoral Fellow"}`;

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = resp.content[0].type === 'text' ? resp.content[0].text : '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON');
    const parsed = JSON.parse(match[0]) as {
      research_tags?: string[];
      research_summary_cn?: string;
      position_title?: string;
    };

    const validTitles: PositionTitle[] = [
      'Professor', 'Associate Professor', 'Senior Lecturer', 'Lecturer',
      'Senior Research Fellow', 'Research Fellow', 'Postdoctoral Fellow',
    ];
    const position_title = validTitles.includes(parsed.position_title as PositionTitle)
      ? (parsed.position_title as PositionTitle)
      : inferPositionTitle(params.hIndex, params.worksCount);

    return {
      research_tags: (parsed.research_tags ?? []).filter((t: string) => typeof t === 'string').slice(0, 5),
      research_summary_cn: parsed.research_summary_cn ?? '',
      position_title,
    };
  } catch {
    return {
      research_tags: params.topics.slice(0, 3),
      research_summary_cn: `${params.name}是${params.university}的研究者，主要研究方向为${params.topics.slice(0, 3).join('、')}。H-index: ${params.hIndex}，总引用量: ${params.citationCount}。`,
      position_title: inferPositionTitle(params.hIndex, params.worksCount),
    };
  }
}

// ─── Opportunity score ────────────────────────────────────────────────────────

function calcOpportunityScore(params: {
  hIndex: number;
  citationCount: number;
  positionTitle: PositionTitle;
  recentPaperCount: number;
}): number {
  let score = 0;
  const t = params.positionTitle;

  // Career stage: ECR and mid-career more likely to take students
  if (t === 'Postdoctoral Fellow')      score += 20;
  else if (t === 'Research Fellow')     score += 28;
  else if (t === 'Senior Research Fellow') score += 25;
  else if (t === 'Lecturer')            score += 25;
  else if (t === 'Senior Lecturer')     score += 20;
  else if (t === 'Associate Professor') score += 15;
  else score += 8; // Full Professor — selective

  // Publication momentum (max 25)
  score += Math.min(25, params.recentPaperCount * 8);

  // H-index profile strength (max 25)
  score += Math.min(25, Math.round(params.hIndex / 1.5));

  // Citation impact (max 20)
  if (params.citationCount >= 10000) score += 20;
  else if (params.citationCount >= 3000) score += 15;
  else if (params.citationCount >= 1000) score += 10;
  else if (params.citationCount >= 300)  score += 5;
  else if (params.citationCount >= 100)  score += 2;

  return Math.min(100, score);
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function findExistingProfessor(ssId: string | null, name: string, university: string): Promise<string | null> {
  if (ssId) {
    const { data } = await supabase.from('professors').select('id').eq('semantic_scholar_id', ssId).single();
    if (data?.id) return data.id as string;
  }
  const { data } = await supabase.from('professors').select('id').eq('name', name).eq('university', university).single();
  return data?.id ?? null;
}

// ─── Pre-load existing names to speed up dedup check ─────────────────────────

async function loadExistingKeys(): Promise<Set<string>> {
  const { data } = await supabase.from('professors').select('name, university');
  const set = new Set<string>();
  for (const row of (data ?? [])) {
    set.add(`${(row.name as string).toLowerCase()}||${(row.university as string).toLowerCase()}`);
  }
  return set;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🦘 Koala Professor Collector v2.0        ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`Mode:         ${DRY_RUN ? '🔍 DRY RUN' : '💾 LIVE'}`);
  console.log(`Universities: ${UNIVERSITIES.map(u => u.short).join(', ')}`);
  console.log(`Min H-index:  ${MIN_H_INDEX} (covers Lecturers + Research Fellows)`);
  console.log(`Pages/uni:    ${PAGES_PER_UNI} × ${AUTHORS_PER_PAGE} = up to ${PAGES_PER_UNI * AUTHORS_PER_PAGE} per university`);
  console.log(`Skip existing:${SKIP_EXISTING ? ' ✅' : ' ❌'}`);
  console.log(`SS API key:   ${SS_API_KEY ? '✅ set' : '⚠️  not set (1 req/s limit)'}`);
  console.log('');

  // Pre-load existing professor keys for fast dedup
  const existingKeys = await loadExistingKeys();
  console.log(`Existing professors in DB: ${existingKeys.size}\n`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalPapers = 0;
  let totalFiltered = 0;
  const errors: string[] = [];
  const startTime = Date.now();

  for (const uni of UNIVERSITIES) {
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`🏛️  ${uni.name}`);
    console.log('─'.repeat(55));

    let oaAuthors: OAAuthor[];
    try {
      oaAuthors = await fetchOAAuthors(uni.ror);
    } catch (e) {
      console.error(`  ❌ OpenAlex failed: ${e}`);
      errors.push(`${uni.short}: OA failed`);
      continue;
    }

    // Filter: h-index ≥ MIN_H_INDEX AND works_count ≥ MIN_WORKS_COUNT
    const qualified = oaAuthors.filter(a =>
      (a.summary_stats?.h_index ?? 0) >= MIN_H_INDEX &&
      (a.works_count ?? 0) >= MIN_WORKS_COUNT
    );
    totalFiltered += oaAuthors.length - qualified.length;
    console.log(`  Fetched: ${oaAuthors.length} → Qualified: ${qualified.length} (h≥${MIN_H_INDEX} & works≥${MIN_WORKS_COUNT})`);

    for (let i = 0; i < qualified.length; i++) {
      const author = qualified[i];
      const hIdx = author.summary_stats?.h_index ?? 0;
      const progress = `[${String(i + 1).padStart(3)}/${qualified.length}]`;

      process.stdout.write(`  ${progress} ${author.display_name.slice(0, 32).padEnd(32)} h=${String(hIdx).padStart(2)}  `);

      // Fast skip if already in DB and --skip-existing
      const existKey = `${author.display_name.toLowerCase()}||${uni.name.toLowerCase()}`;
      if (SKIP_EXISTING && existingKeys.has(existKey)) {
        console.log('[exists, skip]');
        totalSkipped++;
        continue;
      }

      try {
        let ssAuthor: SSAuthor | null = null;
        let papers: SSPaper[] = [];
        let ssId: string | null = null;

        if (!DRY_RUN) {
          ssAuthor = await searchSSAuthor(author.display_name, uni.name);
          ssId = ssAuthor?.authorId ?? null;
          if (ssId) papers = await fetchSSPapers(ssId);
        }

        const topics = (author.topics ?? [])
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(t => t.display_name);

        const finalHIndex = Math.max(hIdx, ssAuthor?.hIndex ?? 0);
        const finalCitations = Math.max(author.cited_by_count ?? 0, ssAuthor?.citationCount ?? 0);

        const enriched = await claudeEnrich({
          name: author.display_name,
          university: uni.name,
          topics,
          paperTitles: papers.map(p => p.title),
          hIndex: finalHIndex,
          citationCount: finalCitations,
          worksCount: author.works_count ?? 0,
        });

        const currentYear = new Date().getFullYear();
        const recentPaperCount = papers.filter(p => (p.year ?? 0) >= currentYear - 3).length;
        const oppScore = calcOpportunityScore({
          hIndex: finalHIndex,
          citationCount: finalCitations,
          positionTitle: enriched.position_title,
          recentPaperCount,
        });

        process.stdout.write(`→ ${enriched.position_title.padEnd(22)} opp=${String(oppScore).padStart(3)}`);

        if (DRY_RUN) {
          console.log('  [dry-run]');
          totalInserted++;
          continue;
        }

        const profRow = {
          name: author.display_name,
          university: uni.name,
          faculty: '',
          title: enriched.position_title,
          position_title: enriched.position_title,
          research_areas: topics.slice(0, 5),
          email: '',
          profile_url: ssAuthor?.url ?? author.ids?.openalex ?? '',
          google_scholar_url: '',
          grant_status: 'Pending',
          suitable_student_backgrounds: [],
          potential_rp_topics: enriched.research_tags,
          references: enriched.research_summary_cn,
          verification_status: 'Pending',
          semantic_scholar_id: ssId,
          h_index: finalHIndex,
          paper_count: Math.max(author.works_count ?? 0, ssAuthor?.paperCount ?? 0),
          citation_count: finalCitations,
          accepting_students: 'unknown',
          data_sources: ssId ? ['openalex', 'semantic_scholar'] : ['openalex'],
          last_synced_at: new Date().toISOString(),
          opportunity_score: oppScore,
          updated_at: new Date().toISOString(),
        };

        const existingId = await findExistingProfessor(ssId, author.display_name, uni.name);

        let professorId: string;
        if (existingId) {
          const { error } = await supabase.from('professors').update(profRow).eq('id', existingId);
          if (error) throw new Error(`update: ${error.message}`);
          professorId = existingId;
          totalUpdated++;
          process.stdout.write('  [updated]');
        } else {
          const { data: ins, error } = await supabase.from('professors').insert(profRow).select('id').single();
          if (error) throw new Error(`insert: ${error.message}`);
          professorId = ins.id;
          existingKeys.add(existKey);
          totalInserted++;
          process.stdout.write('  [new]');
        }

        if (papers.length > 0) {
          const paperRows = papers.map(p => ({
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
          const { error: pe } = await supabase.from('papers').upsert(paperRows, { onConflict: 'semantic_scholar_id' });
          if (!pe) {
            totalPapers += papers.length;
            process.stdout.write(` +${papers.length}p`);
          }
        }

        console.log('');
      } catch (e) {
        const msg = (e as Error).message;
        console.log(`  ❌ ${msg}`);
        errors.push(`${author.display_name} @ ${uni.short}: ${msg}`);
        totalSkipped++;
      }
    }

    // Print running total after each university
    console.log(`\n  ✅ ${uni.short} done — DB total so far: ${existingKeys.size}`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 60);
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║          Collection Complete               ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  New professors:   ${String(totalInserted).padEnd(23)}║`);
  console.log(`║  Updated:          ${String(totalUpdated).padEnd(23)}║`);
  console.log(`║  Skipped/errors:   ${String(totalSkipped).padEnd(23)}║`);
  console.log(`║  Filtered (low h): ${String(totalFiltered).padEnd(23)}║`);
  console.log(`║  Papers saved:     ${String(totalPapers).padEnd(23)}║`);
  console.log(`║  Time:             ${String(elapsed + 'min').padEnd(23)}║`);
  console.log('╚════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`  • ${e}`));
    if (errors.length > 10) console.log(`  … and ${errors.length - 10} more`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
