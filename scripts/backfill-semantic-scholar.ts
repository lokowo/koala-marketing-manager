/**
 * Backfill Semantic Scholar IDs by searching SS API by author name + university.
 *
 * Usage: npx tsx scripts/backfill-semantic-scholar.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const candidates = [
  resolve(__dirname, '..', '.env.local'),
  resolve(process.cwd(), '.env.local'),
  '/Users/jhe/Desktop/koala-marketing-manager/.env.local',
];
for (const envPath of candidates) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
    console.log(`Loaded env from: ${envPath}`);
    break;
  } catch { /* try next */ }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SS_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || '';
const DELAY_MS = SS_API_KEY ? 120 : 1100; // 10 req/sec with key, 1/sec without

async function searchSemanticScholar(name: string): Promise<{ authorId: string; url: string } | null> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(name)}&limit=3&fields=authorId,name,affiliations,url`;
    const headers: Record<string, string> = {};
    if (SS_API_KEY) headers['x-api-key'] = SS_API_KEY;

    const res = await fetch(url, { headers });
    if (res.status === 429) {
      // Rate limited — wait and retry once
      await new Promise(r => setTimeout(r, 5000));
      const retry = await fetch(url, { headers });
      if (!retry.ok) return null;
      const retryData = await retry.json();
      const match = retryData.data?.[0];
      if (match) return { authorId: match.authorId, url: match.url || `https://www.semanticscholar.org/author/${match.authorId}` };
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    const match = data.data?.[0];
    if (!match) return null;

    return {
      authorId: match.authorId,
      url: match.url || `https://www.semanticscholar.org/author/${match.authorId}`,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log('Fetching verified professors missing Semantic Scholar ID...');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch all pages
  let professors: Array<{ id: string; name: string; university: string }> = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await db
      .from('professors')
      .select('id, name, university')
      .eq('verification_status', 'Verified')
      .or('semantic_scholar_id.is.null,semantic_scholar_id.eq.')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) { console.error('DB error:', error); process.exit(1); }
    if (!data || data.length === 0) break;
    professors = professors.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`Found ${professors.length} professors to process (delay: ${DELAY_MS}ms)`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < professors.length; i++) {
    const prof = professors[i];

    const result = await searchSemanticScholar(prof.name);

    if (result) {
      await db.from('professors').update({
        semantic_scholar_id: result.authorId,
        updated_at: new Date().toISOString(),
      }).eq('id', prof.id);
      updated++;
    } else {
      notFound++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${professors.length} | Updated: ${updated} | Not found: ${notFound} | Errors: ${errors}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log('\n=== DONE ===');
  console.log(`Total: ${professors.length} | Updated: ${updated} | Not found: ${notFound} | Errors: ${errors}`);
}

main().catch(console.error);
