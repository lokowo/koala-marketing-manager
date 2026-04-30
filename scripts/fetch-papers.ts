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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🦘 Koala Paper Fetcher v2.0        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`SS API key: ${SS_API_KEY ? '✅ set' : '⚠️  not set (1 req/s limit)'}\n`);

  const { data: professors, error } = await supabase
    .from('professors')
    .select('id, name, university, semantic_scholar_id')
    .order('opportunity_score', { ascending: false });

  if (error) { console.error('❌ Failed to fetch professors:', error.message); process.exit(1); }
  console.log(`Found ${professors.length} professors to process\n`);

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
