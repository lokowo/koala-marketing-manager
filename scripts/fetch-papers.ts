/**
 * Fetch Top-5 papers for all professors from Semantic Scholar
 * Run: npx tsx scripts/fetch-papers.ts
 *
 * v2: improved SS author matching (name + university affiliation check)
 *     auto-clears wrong SS IDs that return 0 papers then re-searches
 */

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

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SS_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Missing Supabase env vars'); process.exit(1); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY) as any;

const SS_DELAY_MS = SS_API_KEY ? 1100 : 1200; // 1 req/s with key
let lastSSCall = 0;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function ssDelay() {
  const now = Date.now();
  const elapsed = now - lastSSCall;
  if (elapsed < SS_DELAY_MS) await sleep(SS_DELAY_MS - elapsed);
  lastSSCall = Date.now();
}

function ssHeaders(): HeadersInit {
  return SS_API_KEY ? { 'x-api-key': SS_API_KEY } : {};
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SSAuthor {
  authorId: string;
  name: string;
  affiliations: string[];
  hIndex: number;
  paperCount: number;
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

// ─── SS author search with affiliation validation ─────────────────────────────

async function searchSSAuthor(name: string, university: string): Promise<string | null> {
  await ssDelay();
  const url = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(name)}&fields=authorId,name,affiliations,hIndex,paperCount&limit=5`;
  try {
    const res = await fetch(url, { headers: ssHeaders(), signal: AbortSignal.timeout(10000) });
    if (res.status === 429) { await sleep(5000); return null; }
    if (!res.ok) return null;
    const data = await res.json() as { data: SSAuthor[] };
    const candidates = data.data ?? [];

    const nameParts = name.toLowerCase().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    // Keywords from university name for affiliation check (skip short words)
    const uniKeywords = university.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // 1st pass: name matches AND affiliation matches AND has papers
    for (const c of candidates) {
      const nameOk = c.name.toLowerCase().includes(lastName);
      const affOk = (c.affiliations ?? []).some(a =>
        uniKeywords.some(k => a.toLowerCase().includes(k))
      );
      if (nameOk && affOk && (c.paperCount ?? 0) > 0) return c.authorId;
    }

    // 2nd pass: name matches + has papers (affiliation might not be indexed)
    for (const c of candidates) {
      const nameOk = c.name.toLowerCase().includes(lastName);
      if (nameOk && (c.paperCount ?? 0) >= 5) return c.authorId;
    }

    // 3rd pass: exact full name match
    const fullNameLower = name.toLowerCase();
    for (const c of candidates) {
      if (c.name.toLowerCase() === fullNameLower && (c.paperCount ?? 0) > 0) return c.authorId;
    }

    return null;
  } catch { return null; }
}

// ─── Fetch papers by SS author ID ─────────────────────────────────────────────

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

// ─── CLI argument parsing ──────────────────────────────────────────────────────

interface CliOptions {
  id: string | null;
  slug: string | null;
  verifiedMissing: boolean;
  limit: number | null;
}

function printUsage() {
  console.error(`
Usage: npx tsx scripts/fetch-papers.ts [options]

Options:
  --id=<uuid>          只处理这一位教授（professors.id）
  --slug=<slug>        只处理这一位教授（professors.slug）
  --verified-missing   只处理 verification_status = 'Verified' 且 papers 表中还没有任何记录的教授
  --limit=<n>          最多处理 n 位教授（可与其他任意一个组合）

不带任何参数时处理全部教授，按 opportunity_score 降序。
--id 与 --slug 互斥，只能二选一。

Examples:
  npx tsx scripts/fetch-papers.ts --id=bd582183-1092-4947-981e-a0cbdeb337aa
  npx tsx scripts/fetch-papers.ts --slug=amin-beheshti
  npx tsx scripts/fetch-papers.ts --verified-missing --limit=100
`);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { id: null, slug: null, verifiedMissing: false, limit: null };

  for (const token of argv) {
    if (token.startsWith('--id=')) {
      opts.id = token.slice('--id='.length);
    } else if (token.startsWith('--slug=')) {
      opts.slug = token.slice('--slug='.length);
    } else if (token === '--verified-missing') {
      opts.verifiedMissing = true;
    } else if (token.startsWith('--limit=')) {
      const raw = token.slice('--limit='.length);
      if (!/^[1-9]\d*$/.test(raw)) {
        console.error(`❌ --limit 必须是正整数，收到：${raw}`);
        printUsage();
        process.exit(1);
      }
      opts.limit = parseInt(raw, 10);
    } else {
      console.error(`❌ 无法识别的参数：${token}`);
      printUsage();
      process.exit(1);
    }
  }

  if (opts.id && opts.slug) {
    console.error('❌ --id 与 --slug 只能二选一');
    printUsage();
    process.exit(1);
  }

  return opts;
}

// ─── Paginated fetch (avoid Supabase 1000-row cap) ──────────────────────────────

interface ProfessorRow { id: string; name: string; university: string; semantic_scholar_id: string | null }

const PAGE_SIZE = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllPages<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) { console.error('❌ Query failed:', error.message); process.exit(1); }
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

// ─── Resolve the professor set to process based on CLI options ──────────────────

async function resolveProfessors(opts: CliOptions): Promise<{ mode: string; professors: ProfessorRow[] }> {
  // single: --id / --slug
  if (opts.id || opts.slug) {
    const col = opts.id ? 'id' : 'slug';
    const val = opts.id ?? opts.slug;
    const { data, error } = await supabase
      .from('professors')
      .select('id, name, university, semantic_scholar_id')
      .eq(col, val)
      .maybeSingle();
    if (error) { console.error('❌ Failed to fetch professor:', error.message); process.exit(1); }
    if (!data) { console.error(`❌ 找不到教授（${col}=${val}）`); process.exit(1); }
    return { mode: 'single', professors: [data as ProfessorRow] };
  }

  // verified-missing: Verified professors with no papers rows yet
  if (opts.verifiedMissing) {
    const paperProfIds = await fetchAllPages<{ professor_id: string }>((from, to) =>
      supabase.from('papers').select('professor_id').range(from, to)
    );
    const withPapers = new Set(paperProfIds.map(r => r.professor_id));

    const verified = await fetchAllPages<ProfessorRow>((from, to) =>
      supabase
        .from('professors')
        .select('id, name, university, semantic_scholar_id')
        .eq('verification_status', 'Verified')
        .order('opportunity_score', { ascending: false })
        .range(from, to)
    );
    return { mode: 'verified-missing', professors: verified.filter(p => !withPapers.has(p.id)) };
  }

  // all: full professor set, opportunity_score desc
  const professors = await fetchAllPages<ProfessorRow>((from, to) =>
    supabase
      .from('professors')
      .select('id, name, university, semantic_scholar_id')
      .order('opportunity_score', { ascending: false })
      .range(from, to)
  );
  return { mode: 'all', professors };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log('╔══════════════════════════════════════╗');
  console.log('║   🦘 Koala Paper Fetcher v2.0        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`SS API key: ${SS_API_KEY ? '✅ set' : '⚠️  not set (1 req/s limit)'}\n`);

  const { mode, professors: resolved } = await resolveProfessors(opts);
  const professors = opts.limit != null ? resolved.slice(0, opts.limit) : resolved;

  console.log(`Filter mode: ${mode}`);
  console.log(`Will process ${professors.length} professor(s)\n`);

  let totalPapers = 0;
  let noId = 0;
  let zeroPapers = 0;
  let wrongId = 0;
  const startTime = Date.now();

  for (let i = 0; i < professors.length; i++) {
    const prof = professors[i] as { id: string; name: string; university: string; semantic_scholar_id: string | null };
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${professors.length}] ${prof.name.slice(0, 34).padEnd(34)}`);

    let ssId = prof.semantic_scholar_id ?? null;

    // If no stored ID, search by name + university
    if (!ssId) {
      ssId = await searchSSAuthor(prof.name, prof.university);
      if (ssId) {
        await supabase.from('professors').update({ semantic_scholar_id: ssId }).eq('id', prof.id);
      }
    }

    if (!ssId) {
      console.log(' [no SS ID]');
      noId++;
      continue;
    }

    // Fetch papers with stored/found ID
    let papers = await fetchSSPapers(ssId);

    // If stored ID returns 0 papers, it's likely wrong — clear it and re-search
    if (papers.length === 0 && prof.semantic_scholar_id) {
      process.stdout.write(' [retry search]');
      const freshId = await searchSSAuthor(prof.name, prof.university);
      if (freshId && freshId !== prof.semantic_scholar_id) {
        papers = await fetchSSPapers(freshId);
        if (papers.length > 0) {
          ssId = freshId;
          await supabase.from('professors').update({ semantic_scholar_id: freshId }).eq('id', prof.id);
          wrongId++;
        }
      }
    }

    if (papers.length === 0) {
      console.log(' [0 papers]');
      zeroPapers++;
      continue;
    }

    const rows = papers.map(p => ({
      professor_id: prof.id,
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

    const { error: pe } = await supabase
      .from('papers')
      .upsert(rows, { onConflict: 'semantic_scholar_id' });

    if (pe) {
      console.log(` ⚠️ ${pe.message}`);
    } else {
      totalPapers += papers.length;
      console.log(` ✅ +${papers.length}`);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      Paper Fetch v2 Complete         ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Papers saved:     ${String(totalPapers).padEnd(18)}║`);
  console.log(`║  Wrong ID fixed:   ${String(wrongId).padEnd(18)}║`);
  console.log(`║  No SS ID:         ${String(noId).padEnd(18)}║`);
  console.log(`║  0 papers found:   ${String(zeroPapers).padEnd(18)}║`);
  console.log(`║  Time:             ${String(elapsed + 's').padEnd(18)}║`);
  console.log('╚══════════════════════════════════════╝');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
