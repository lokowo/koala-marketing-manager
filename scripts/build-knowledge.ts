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
const OPENAI_DELAY = 200; // 5 req/sec conservative

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
  research_areas: string[] | null;
  references: string | null;
  faculty: string | null;
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

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🧠 Koala Knowledge Builder v1.0    ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Fetch professors
  const { data: professors, error: profErr } = await supabase
    .from('professors')
    .select('id, name, university, research_areas, references, faculty')
    .order('opportunity_score', { ascending: false });

  if (profErr) { console.error('❌ professors:', profErr.message); process.exit(1); }
  console.log(`Professors: ${professors.length}`);

  // Fetch papers
  const { data: papers, error: paperErr } = await supabase
    .from('papers')
    .select('id, professor_id, title, year, abstract, journal, citation_count')
    .not('abstract', 'is', null)
    .neq('abstract', '');

  if (paperErr) { console.error('❌ papers:', paperErr.message); process.exit(1); }
  console.log(`Papers with abstracts: ${papers?.length ?? 0}\n`);

  let inserted = 0;
  let skipped = 0;
  const startTime = Date.now();

  // --- Professor profiles ---
  console.log('── Professor profiles ──');
  for (let i = 0; i < professors.length; i++) {
    const prof = professors[i] as Professor;
    const areas = (prof.research_areas ?? []).join(', ');
    const text = [
      `Professor: ${prof.name}`,
      `University: ${prof.university}`,
      prof.faculty ? `Faculty: ${prof.faculty}` : '',
      areas ? `Research areas: ${areas}` : '',
      prof.references ? `Bio: ${prof.references.slice(0, 800)}` : '',
    ].filter(Boolean).join('\n');

    process.stdout.write(`  [${String(i + 1).padStart(3)}/${professors.length}] ${prof.name.slice(0, 35).padEnd(35)}`);

    const titleKey = `[PROF] ${prof.name} — ${prof.university}`;

    // Check if already embedded
    const { count } = await supabase
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'professor_paper')
      .eq('source_title', titleKey);

    if ((count ?? 0) > 0) {
      console.log(' [skip]');
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
  const paperList = (papers ?? []) as Paper[];
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

      process.stdout.write(`  [${String(i + 1).padStart(3)}/${paperList.length}] ${paper.title.slice(0, 35).padEnd(35)}`);

      const titleKey = `[PAPER] ${paper.title.slice(0, 200)}`;

      const { count } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('source_type', 'professor_paper')
        .eq('source_title', titleKey);

      if ((count ?? 0) > 0) {
        console.log(' [skip]');
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
