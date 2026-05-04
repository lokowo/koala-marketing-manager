/**
 * Build knowledge_chunks from paper abstracts + professor descriptions
 * Run: npx tsx scripts/build-knowledge.ts
 *
 * Prereq: knowledge_chunks table must exist (run supabase/schema.sql)
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
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Missing Supabase env vars'); process.exit(1); }
if (!OPENAI_KEY) { console.error('❌ Missing OPENAI_API_KEY'); process.exit(1); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY) as any;

let lastOpenAICall = 0;
const OPENAI_DELAY = 60; // ~16 req/sec, well under OpenAI's 3000 RPM limit

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function embed(text: string): Promise<number[] | null> {
  const now = Date.now();
  const elapsed = now - lastOpenAICall;
  if (elapsed < OPENAI_DELAY) await sleep(OPENAI_DELAY - elapsed);
  lastOpenAICall = Date.now();

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI error:', res.status, err.slice(0, 100));
      return null;
    }
    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0]?.embedding ?? null;
  } catch (e) {
    console.error('Embed error:', e);
    return null;
  }
}

interface Professor {
  id: string;
  name: string;
  university: string;
  faculty: string | null;
  position_title: string | null;
  research_areas: string[] | null;
  h_index: number | null;
  paper_count: number | null;
  citation_count: number | null;
  accepting_students: string | null;
  references: string | null;
}

interface Paper {
  id: string;
  professor_id: string;
  title: string;
  year: number | null;
  abstract: string | null;
  journal: string | null;
  citation_count: number;
}

const PROFESSORS_ONLY = process.argv.includes('--professors-only');

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🧠 Koala Knowledge Builder v1.1    ║');
  console.log('╚══════════════════════════════════════╝\n');
  if (PROFESSORS_ONLY) console.log('Mode: professors only (--professors-only)\n');

  // Fetch professors (paginated to get all)
  const professors: Professor[] = [];
  const PAGE_SIZE = 1000;
  let page = 0;
  while (true) {
    const { data, error: profErr } = await supabase
      .from('professors')
      .select('id, name, university, faculty, position_title, research_areas, h_index, paper_count, citation_count, accepting_students, references')
      .order('opportunity_score', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (profErr) { console.error('❌ professors:', profErr.message); process.exit(1); }
    professors.push(...(data as Professor[]));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
    page++;
  }
  console.log(`Professors: ${professors.length}`);

  // Fetch papers with abstracts (paginated)
  const papers: Paper[] = [];
  if (!PROFESSORS_ONLY) {
    let paperPage = 0;
    while (true) {
      const { data, error: paperErr } = await supabase
        .from('papers')
        .select('id, professor_id, title, year, abstract, journal, citation_count')
        .not('abstract', 'is', null)
        .neq('abstract', '')
        .order('citation_count', { ascending: false })
        .range(paperPage * 1000, (paperPage + 1) * 1000 - 1);
      if (paperErr) { console.error('❌ papers:', paperErr.message); process.exit(1); }
      papers.push(...((data ?? []) as Paper[]));
      if ((data?.length ?? 0) < 1000) break;
      paperPage++;
    }
  }
  console.log(`Papers with abstracts: ${papers.length}\n`);

  let inserted = 0;
  let skipped = 0;
  const startTime = Date.now();

  // Pre-load all existing source_titles to avoid one Supabase query per professor
  console.log('Loading existing chunks index…');
  const existingTitles = new Set<string>();
  let chunkPage = 0;
  while (true) {
    const { data: existing } = await supabase
      .from('knowledge_chunks')
      .select('source_title')
      .range(chunkPage * 1000, (chunkPage + 1) * 1000 - 1);
    if (!existing || existing.length === 0) break;
    for (const row of existing) existingTitles.add(row.source_title as string);
    if (existing.length < 1000) break;
    chunkPage++;
  }
  console.log(`  Existing chunks: ${existingTitles.size}\n`);

  // --- Professor profiles ---
  console.log('── Professor profiles ──');
  for (let i = 0; i < professors.length; i++) {
    const prof = professors[i] as Professor;
    const areas = (prof.research_areas ?? []).join(', ');
    const text = [
      `Professor: ${prof.name}`,
      prof.position_title ? `Position: ${prof.position_title}` : '',
      `University: ${prof.university}`,
      prof.faculty ? `Faculty: ${prof.faculty}` : '',
      areas ? `Research areas: ${areas}` : '',
      prof.h_index != null ? `H-Index: ${prof.h_index}` : '',
      prof.paper_count != null ? `Papers published: ${prof.paper_count}` : '',
      prof.citation_count != null ? `Total citations: ${prof.citation_count}` : '',
      prof.accepting_students ? `Accepting students: ${prof.accepting_students}` : '',
      prof.references ? `Bio: ${prof.references.slice(0, 800)}` : '',
    ].filter(Boolean).join('\n');

    process.stdout.write(`  [${String(i + 1).padStart(4)}/${professors.length}] ${prof.name.slice(0, 35).padEnd(35)}`);

    const titleKey = `[PROF] ${prof.name} — ${prof.university}`;

    if (existingTitles.has(titleKey)) {
      process.stdout.write(' [skip]\n');
      skipped++;
      continue;
    }

    const embedding = await embed(text);
    if (!embedding) { console.log(' [embed error]'); continue; }

    const { error } = await supabase.from('knowledge_chunks').insert({
      source_type: 'professor_paper',
      source_title: titleKey,
      content: text,
      embedding,
    });

    if (error) {
      console.log(` ⚠️ ${error.message}`);
    } else {
      console.log(' ✅');
      inserted++;
    }
  }

  // --- Paper abstracts ---
  const paperList = PROFESSORS_ONLY ? [] : (papers ?? []) as Paper[];
  if (paperList.length > 0) {
    console.log('\n── Paper abstracts ──');
    const profMap = new Map((professors as Professor[]).map(p => [p.id, p.name]));

    for (let i = 0; i < paperList.length; i++) {
      const paper = paperList[i];
      const profName = profMap.get(paper.professor_id) ?? 'Unknown';
      const text = [
        `Title: ${paper.title}`,
        paper.year ? `Year: ${paper.year}` : '',
        paper.journal ? `Journal: ${paper.journal}` : '',
        paper.citation_count ? `Citations: ${paper.citation_count}` : '',
        `Author: ${profName}`,
        `Abstract: ${(paper.abstract ?? '').slice(0, 1500)}`,
      ].filter(Boolean).join('\n');

      process.stdout.write(`  [${String(i + 1).padStart(4)}/${paperList.length}] ${paper.title.slice(0, 35).padEnd(35)}`);

      const titleKey = `[PAPER] ${paper.title.slice(0, 200)}`;

      if (existingTitles.has(titleKey)) {
        process.stdout.write(' [skip]\n');
        skipped++;
        continue;
      }

      const embedding = await embed(text);
      if (!embedding) { console.log(' [embed error]'); continue; }

      const { error } = await supabase.from('knowledge_chunks').insert({
        source_type: 'professor_paper',
        source_title: titleKey,
        content: text,
        embedding,
      });

      if (error) {
        console.log(` ⚠️ ${error.message}`);
      } else {
        console.log(' ✅');
        inserted++;
      }
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      Knowledge Build Complete        ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║  Chunks inserted:  ${String(inserted).padEnd(18)}║`);
  console.log(`║  Skipped (cached): ${String(skipped).padEnd(18)}║`);
  console.log(`║  Time:             ${String(elapsed + 's').padEnd(18)}║`);
  console.log('╚══════════════════════════════════════╝');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
