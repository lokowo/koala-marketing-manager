#!/usr/bin/env node

/**
 * Backfill research_embedding for professors that are missing it.
 *
 * Usage:
 *   node scripts/backfill-professor-embeddings.mjs              # full run
 *   node scripts/backfill-professor-embeddings.mjs --limit 10   # test with 10 records
 *   node scripts/backfill-professor-embeddings.mjs --dry-run    # count only, no writes
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY  = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null;
const dryRun = args.includes('--dry-run');

const BATCH_SIZE = 100;
const OPENAI_BATCH = 100;       // embeddings API supports up to 2048 inputs
const DELAY_BETWEEN_BATCHES = 500; // ms

function buildEmbeddingText(p) {
  const parts = [p.name, p.university];
  if (p.position_title) parts.push(p.position_title);
  if (p.faculty) parts.push(p.faculty);
  if (p.research_areas?.length) parts.push(p.research_areas.join(', '));
  if (p.ai_bio_en) parts.push(p.ai_bio_en.slice(0, 500));
  else if (p.ai_summary) parts.push(p.ai_summary.slice(0, 500));
  return parts.join(' | ');
}

async function getEmbeddings(texts) {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OpenAI API ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  return data.data.map(d => d.embedding);
}

async function main() {
  // Count total missing
  const { count: totalMissing } = await supabase
    .from('professors')
    .select('id', { count: 'exact', head: true })
    .is('research_embedding', null);

  console.log(`Total professors missing embedding: ${totalMissing}`);
  const target = limitArg ? Math.min(limitArg, totalMissing) : totalMissing;
  console.log(`Will process: ${target}${dryRun ? ' (DRY RUN)' : ''}`);

  if (dryRun || target === 0) return;

  let processed = 0;
  let updated = 0;
  let failed = 0;

  while (processed < target) {
    const batchSize = Math.min(BATCH_SIZE, target - processed);

    const { data: rows, error } = await supabase
      .from('professors')
      .select('id, name, university, position_title, faculty, research_areas, ai_bio_en, ai_summary')
      .is('research_embedding', null)
      .limit(batchSize);

    if (error) {
      console.error('DB fetch error:', error.message);
      break;
    }
    if (!rows?.length) {
      console.log('No more rows without embedding.');
      break;
    }

    const texts = rows.map(buildEmbeddingText);

    try {
      // Process in sub-batches for the OpenAI API
      for (let i = 0; i < rows.length; i += OPENAI_BATCH) {
        const subRows = rows.slice(i, i + OPENAI_BATCH);
        const subTexts = texts.slice(i, i + OPENAI_BATCH);

        const embeddings = await getEmbeddings(subTexts);

        // Update each row
        const updates = subRows.map((row, idx) =>
          supabase
            .from('professors')
            .update({ research_embedding: JSON.stringify(embeddings[idx]) })
            .eq('id', row.id)
        );

        const results = await Promise.all(updates);
        for (const r of results) {
          if (r.error) {
            failed++;
            console.error(`  Failed to update ${subRows[results.indexOf(r)]?.name}: ${r.error.message}`);
          } else {
            updated++;
          }
        }
      }
    } catch (err) {
      console.error(`  Embedding API error at batch ${processed}: ${err.message}`);
      failed += rows.length;
      // Wait longer on error (rate limit)
      await new Promise(r => setTimeout(r, 5000));
    }

    processed += rows.length;

    if (processed % 500 === 0 || processed >= target) {
      console.log(`Progress: ${processed} / ${target} (updated: ${updated}, failed: ${failed})`);
    }

    await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}, Total processed: ${processed}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
