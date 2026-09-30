/**
 * Fetch each professor's top-5 most-cited papers from Semantic Scholar
 * Run: npx tsx scripts/fetch-papers.ts [--id= | --slug= | --verified-missing] [--limit=] [--ss-id=] [--dry-run]
 *
 * v3: pages all papers and sorts locally by citationCount (the /author/{id}/papers
 *     endpoint ignores sort); stricter author matching (full-name + affiliation,
 *     ambiguous → skip); 429 retry/skip distinct from "0 papers"; replaces stale
 *     rows on re-run; --dry-run preview and --ss-id manual override.
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

// ─── SS fetch with 429 retry (5s / 15s / 30s, max 3 retries) ───────────────────

// Returns rateLimited=true only when 429 persists after all retries.
// On network/timeout error, res is null and rateLimited is false (caller treats as error).
async function ssFetch(url: string): Promise<{ res: Response | null; rateLimited: boolean }> {
  const backoff = [5000, 15000, 30000];
  for (let attempt = 0; ; attempt++) {
    await ssDelay();
    try {
      const res = await fetch(url, { headers: ssHeaders(), signal: AbortSignal.timeout(10000) });
      if (res.status === 429) {
        if (attempt < backoff.length) { await sleep(backoff[attempt]); continue; }
        return { res: null, rateLimited: true };
      }
      return { res, rateLimited: false };
    } catch {
      return { res: null, rateLimited: false };
    }
  }
}

// ─── Name / affiliation normalization ──────────────────────────────────────────

const UNI_STOP_WORDS = new Set([
  'university', 'institute', 'college', 'school', 'technology',
  'of', 'the', 'and', 'faculty', 'department',
]);

// lowercase + strip accents (NFD) — handles e.g. "Kâafar" → "kaafar"
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Drop parenthesised parts (e.g. "(MQ)") and stop words → distinctive keywords only
function uniKeywords(university: string): string[] {
  return norm(university.replace(/\([^)]*\)/g, ' '))
    .split(/\s+/)
    .filter(w => w.length > 1 && !UNI_STOP_WORDS.has(w));
}

// Every word of `name` must appear in the candidate name
function fullNameMatch(name: string, candidateName: string): boolean {
  const cand = norm(candidateName);
  return norm(name).split(/\s+/).filter(Boolean).every(w => cand.includes(w));
}

// ─── SS author search with stricter matching ───────────────────────────────────

type AuthorResult =
  | { status: 'ok'; pass: 'search-pass-1' | 'search-pass-2'; author: SSAuthor }
  | { status: 'ambiguous'; count: number; candidates: SSAuthor[] }
  | { status: 'none'; candidates: SSAuthor[] }
  | { status: 'rate_limited' };

async function searchSSAuthor(name: string, university: string): Promise<AuthorResult> {
  const url = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(name)}&fields=authorId,name,affiliations,hIndex,paperCount&limit=20`;
  const { res, rateLimited } = await ssFetch(url);
  if (rateLimited) return { status: 'rate_limited' };
  if (!res || !res.ok) return { status: 'none', candidates: [] };
  let candidates: SSAuthor[];
  try {
    const data = await res.json() as { data: SSAuthor[] };
    candidates = (data.data ?? []).map(c => ({ ...c, affiliations: c.affiliations ?? [] }));
  } catch { return { status: 'none', candidates: [] }; }

  const keywords = uniKeywords(university);

  // Pass 1: full name + affiliation hit + has papers → pick highest paperCount
  const pass1 = candidates.filter(c =>
    fullNameMatch(name, c.name) &&
    (c.paperCount ?? 0) > 0 &&
    c.affiliations.some(a => keywords.some(k => norm(a).includes(k)))
  );
  if (pass1.length > 0) {
    const best = pass1.reduce((a, b) => ((b.paperCount ?? 0) > (a.paperCount ?? 0) ? b : a));
    return { status: 'ok', pass: 'search-pass-1', author: best };
  }

  // Pass 2: full name + paperCount >= 5 (affiliation may be unindexed)
  const pass2 = candidates.filter(c => fullNameMatch(name, c.name) && (c.paperCount ?? 0) >= 5);
  if (pass2.length >= 2) return { status: 'ambiguous', count: pass2.length, candidates };
  if (pass2.length === 1) return { status: 'ok', pass: 'search-pass-2', author: pass2[0] };

  return { status: 'none', candidates };
}

// ─── Fetch a single author's metadata (for --dry-run preview of stored/--ss-id) ─

async function fetchSSAuthorMeta(authorId: string): Promise<{ status: 'ok' | 'rate_limited' | 'error'; author: SSAuthor | null }> {
  const url = `https://api.semanticscholar.org/graph/v1/author/${authorId}?fields=name,affiliations,hIndex,paperCount`;
  const { res, rateLimited } = await ssFetch(url);
  if (rateLimited) return { status: 'rate_limited', author: null };
  if (!res || !res.ok) return { status: 'error', author: null };
  try {
    const a = await res.json() as SSAuthor;
    return { status: 'ok', author: { authorId, name: a.name, affiliations: a.affiliations ?? [], hIndex: a.hIndex, paperCount: a.paperCount } };
  } catch { return { status: 'error', author: null }; }
}

// ─── Fetch papers by SS author ID: page through all, sort locally, top 5 ────────

// The SS /author/{id}/papers endpoint does NOT support a sort param (it silently
// ignores it and returns newest-first). So we page through up to 3000 papers and
// sort locally by citationCount desc, then year desc, and take the top 5.
type PapersResult = { status: 'ok' | 'rate_limited' | 'error'; papers: SSPaper[] };

async function fetchSSPapers(authorId: string): Promise<PapersResult> {
  const fields = 'paperId,title,year,citationCount,journal,externalIds,url,abstract';
  const MAX = 3000;
  const collected: SSPaper[] = [];
  let offset = 0;

  while (collected.length < MAX) {
    const url = `https://api.semanticscholar.org/graph/v1/author/${authorId}/papers?fields=${fields}&limit=1000&offset=${offset}`;
    const { res, rateLimited } = await ssFetch(url);
    if (rateLimited) return { status: 'rate_limited', papers: [] };
    if (!res || !res.ok) return { status: 'error', papers: [] };
    let json: { data: SSPaper[]; next?: number };
    try { json = await res.json() as { data: SSPaper[]; next?: number }; }
    catch { return { status: 'error', papers: [] }; }
    const batch = json.data ?? [];
    collected.push(...batch);
    if (json.next === undefined || batch.length === 0) break;
    offset = json.next;
  }

  const top5 = collected
    .slice()
    .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0) || (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 5);
  return { status: 'ok', papers: top5 };
}

// ─── CLI argument parsing ──────────────────────────────────────────────────────

interface CliOptions {
  id: string | null;
  slug: string | null;
  verifiedMissing: boolean;
  limit: number | null;
  dryRun: boolean;
  ssId: string | null;
}

function printUsage() {
  console.error(`
Usage: npx tsx scripts/fetch-papers.ts [options]

Options:
  --id=<uuid>          只处理这一位教授（professors.id）
  --slug=<slug>        只处理这一位教授（professors.slug）
  --verified-missing   只处理 verification_status = 'Verified' 且 papers 表中还没有任何记录的教授
  --limit=<n>          最多处理 n 位教授（可与其他任意一个组合）
  --ss-id=<authorId>   人工指定 SS 作者 ID（纯数字），跳过姓名搜索；只能与 --id 或 --slug 一起用
  --dry-run            预览模式：照常搜索/抓取/排序但不写任何数据库

不带任何参数时处理全部教授，按 opportunity_score 降序。
--id 与 --slug 互斥，只能二选一。

Examples:
  npx tsx scripts/fetch-papers.ts --id=bd582183-1092-4947-981e-a0cbdeb337aa
  npx tsx scripts/fetch-papers.ts --slug=amin-beheshti --dry-run
  npx tsx scripts/fetch-papers.ts --slug=jia-wu --ss-id=1234567
  npx tsx scripts/fetch-papers.ts --verified-missing --limit=100
`);
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { id: null, slug: null, verifiedMissing: false, limit: null, dryRun: false, ssId: null };

  for (const token of argv) {
    if (token.startsWith('--id=')) {
      opts.id = token.slice('--id='.length);
    } else if (token.startsWith('--slug=')) {
      opts.slug = token.slice('--slug='.length);
    } else if (token === '--verified-missing') {
      opts.verifiedMissing = true;
    } else if (token === '--dry-run') {
      opts.dryRun = true;
    } else if (token.startsWith('--ss-id=')) {
      opts.ssId = token.slice('--ss-id='.length);
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

  if (opts.ssId !== null) {
    if (!/^\d+$/.test(opts.ssId)) {
      console.error(`❌ --ss-id 必须是纯数字，收到：${opts.ssId}`);
      printUsage();
      process.exit(1);
    }
    if (!opts.id && !opts.slug) {
      console.error('❌ --ss-id 只能与 --id 或 --slug 一起使用');
      printUsage();
      process.exit(1);
    }
  }

  return opts;
}

// ─── Paginated fetch (avoid Supabase 1000-row cap) ──────────────────────────────

interface ProfessorRow { id: string; slug: string | null; name: string; university: string; semantic_scholar_id: string | null }

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
      .select('id, slug, name, university, semantic_scholar_id')
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
        .select('id, slug, name, university, semantic_scholar_id')
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
      .select('id, slug, name, university, semantic_scholar_id')
      .order('opportunity_score', { ascending: false })
      .range(from, to)
  );
  return { mode: 'all', professors };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Dry-run print helpers ──────────────────────────────────────────────────────

function affText(affiliations: string[] | undefined): string {
  return affiliations && affiliations.length ? affiliations.join('; ') : '(none)';
}

function printDryHeader(prof: ProfessorRow) {
  console.log(`\n[${prof.slug ?? '?'}] ${prof.name}`);
}

function printAuthorLine(authorId: string, author: SSAuthor | null, via: string) {
  console.log(`  SS author: ${authorId} | ${author?.name ?? '(unknown)'} | aff: ${affText(author?.affiliations)} | h=${author?.hIndex ?? '?'} | papers=${author?.paperCount ?? '?'}`);
  console.log(`  匹配方式: ${via}`);
}

function printCandidates(candidates: SSAuthor[]) {
  const top = candidates.slice(0, 5);
  if (top.length === 0) { console.log('  候选: (none)'); return; }
  console.log('  候选:');
  top.forEach((c, i) => {
    console.log(`    ${i + 1}. ${c.authorId} | ${c.name} | aff: ${affText(c.affiliations)} | h=${c.hIndex ?? '?'} | papers=${c.paperCount ?? '?'}`);
  });
}

function printTop5(papers: SSPaper[]) {
  console.log('  Top 5:');
  papers.forEach((p, i) => {
    console.log(`    ${i + 1}. (${p.citationCount ?? 0}) ${p.year ?? '----'} ${p.title}`);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log('╔══════════════════════════════════════╗');
  console.log('║   🦘 Koala Paper Fetcher v2.0        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`SS API key: ${SS_API_KEY ? '✅ set' : '⚠️  not set (1 req/s limit)'}`);
  if (opts.dryRun) console.log('🔍 DRY RUN — 不写任何数据库');
  console.log('');

  const { mode, professors: resolved } = await resolveProfessors(opts);
  const professors = opts.limit != null ? resolved.slice(0, opts.limit) : resolved;

  console.log(`Filter mode: ${mode}`);
  console.log(`Will process ${professors.length} professor(s)\n`);

  let totalPapers = 0;
  let noId = 0;
  let zeroPapers = 0;
  let wrongId = 0;
  let rateLimited = 0;
  const startTime = Date.now();

  for (let i = 0; i < professors.length; i++) {
    const prof = professors[i] as ProfessorRow;
    if (!opts.dryRun) process.stdout.write(`  [${String(i + 1).padStart(3)}/${professors.length}] ${prof.name.slice(0, 34).padEnd(34)}`);

    // ── Resolve author id: --ss-id > stored numeric id > name search ──
    let ssId: string | null = null;
    let matchedVia = '';
    let author: SSAuthor | null = null;
    let fromStored = false;

    if (opts.ssId) {
      ssId = opts.ssId;
      matchedVia = '--ss-id';
      // Persist the manual override so future runs don't re-search / re-hit a bad stored id
      if (!opts.dryRun && prof.semantic_scholar_id !== opts.ssId) {
        await supabase.from('professors').update({ semantic_scholar_id: opts.ssId }).eq('id', prof.id);
      }
    } else if (prof.semantic_scholar_id && /^\d+$/.test(prof.semantic_scholar_id)) {
      ssId = prof.semantic_scholar_id;
      matchedVia = 'stored-id';
      fromStored = true;
    }

    if (!ssId) {
      const r = await searchSSAuthor(prof.name, prof.university);
      if (r.status === 'rate_limited') {
        rateLimited++;
        if (opts.dryRun) { printDryHeader(prof); console.log('  [rate limited — skipped]'); }
        else console.log(' [rate limited — skipped]');
        continue;
      }
      if (r.status === 'ambiguous') {
        noId++;
        if (opts.dryRun) { printDryHeader(prof); console.log(`  [ambiguous: ${r.count} candidates]`); printCandidates(r.candidates); }
        else console.log(` [ambiguous: ${r.count} candidates]`);
        continue;
      }
      if (r.status === 'none') {
        noId++;
        if (opts.dryRun) { printDryHeader(prof); console.log('  [no SS ID]'); printCandidates(r.candidates); }
        else console.log(' [no SS ID]');
        continue;
      }
      ssId = r.author.authorId;
      matchedVia = r.pass;
      author = r.author;
      if (!opts.dryRun) await supabase.from('professors').update({ semantic_scholar_id: ssId }).eq('id', prof.id);
    }

    // For dry-run preview of stored-id / --ss-id, fetch author metadata for display
    if (opts.dryRun && !author && ssId) {
      const meta = await fetchSSAuthorMeta(ssId);
      if (meta.status === 'rate_limited') {
        rateLimited++;
        printDryHeader(prof);
        console.log('  [rate limited — skipped]');
        continue;
      }
      author = meta.author;
    }

    // ── Fetch papers ──
    const result = await fetchSSPapers(ssId);
    if (result.status === 'rate_limited') {
      rateLimited++;
      if (opts.dryRun) { printDryHeader(prof); printAuthorLine(ssId, author, matchedVia); console.log('  [rate limited — skipped]'); }
      else console.log(' [rate limited — skipped]');
      continue;
    }
    if (result.status === 'error') {
      zeroPapers++;
      if (opts.dryRun) { printDryHeader(prof); printAuthorLine(ssId, author, matchedVia); console.log('  [error]'); }
      else console.log(' [error]');
      continue;
    }

    let papers = result.papers;

    // Only a confirmed 0-paper result from a stored id triggers the re-search
    if (papers.length === 0 && fromStored) {
      if (!opts.dryRun) process.stdout.write(' [retry search]');
      const r2 = await searchSSAuthor(prof.name, prof.university);
      if (r2.status === 'rate_limited') {
        rateLimited++;
        if (opts.dryRun) { printDryHeader(prof); console.log('  [rate limited — skipped]'); }
        else console.log(' [rate limited — skipped]');
        continue;
      }
      if (r2.status === 'ok' && r2.author.authorId !== ssId) {
        const res2 = await fetchSSPapers(r2.author.authorId);
        if (res2.status === 'rate_limited') {
          rateLimited++;
          if (opts.dryRun) { printDryHeader(prof); console.log('  [rate limited — skipped]'); }
          else console.log(' [rate limited — skipped]');
          continue;
        }
        if (res2.status === 'ok' && res2.papers.length > 0) {
          ssId = r2.author.authorId;
          author = r2.author;
          matchedVia = r2.pass;
          papers = res2.papers;
          if (!opts.dryRun) {
            await supabase.from('professors').update({ semantic_scholar_id: ssId }).eq('id', prof.id);
            wrongId++;
          }
        }
      }
    }

    if (papers.length === 0) {
      zeroPapers++;
      if (opts.dryRun) { printDryHeader(prof); printAuthorLine(ssId, author, matchedVia); console.log('  [0 papers]'); }
      else console.log(' [0 papers]');
      continue;
    }

    // ── Dry run: preview only, never write ──
    if (opts.dryRun) {
      printDryHeader(prof);
      printAuthorLine(ssId, author, matchedVia);
      printTop5(papers);
      totalPapers += papers.length;
      continue;
    }

    // ── Write: upsert new 5, then delete stale rows for this professor ──
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
      continue;
    }

    // Remove old papers no longer in the top-5 (only after a successful upsert)
    const keepIds = papers.map(p => p.paperId);
    const { error: de, count: delCount } = await supabase
      .from('papers')
      .delete({ count: 'exact' })
      .eq('professor_id', prof.id)
      .not('semantic_scholar_id', 'in', `(${keepIds.join(',')})`);
    const removed = de ? 0 : (delCount ?? 0);

    totalPapers += papers.length;
    console.log(` ✅ +${papers.length} (-${removed} old)`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      Paper Fetch v2 Complete         ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Papers saved:     ${String(totalPapers).padEnd(18)}║`);
  console.log(`║  Wrong ID fixed:   ${String(wrongId).padEnd(18)}║`);
  console.log(`║  No SS ID:         ${String(noId).padEnd(18)}║`);
  console.log(`║  0 papers found:   ${String(zeroPapers).padEnd(18)}║`);
  console.log(`║  Rate limited:     ${String(rateLimited).padEnd(18)}║`);
  console.log(`║  Time:             ${String(elapsed + 's').padEnd(18)}║`);
  console.log('╚══════════════════════════════════════╝');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
