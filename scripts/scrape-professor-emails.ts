/**
 * scrape-professor-emails.ts
 *
 * Strategy (3 phases):
 *  Phase 1 — OpenAlex API: fetch homepage_url for 1471 OpenAlex-sourced professors
 *  Phase 2 — SemanticScholar API: fetch homepage for 1567 SS-sourced professors
 *  Phase 3 — For each homepage URL found, GET the page and regex-extract email
 *
 * NOTE: university staff directory pages (ANU, UNSW, etc.) require JS rendering
 * and are NOT scrapeable via simple HTTP, so we rely on API-provided homepage URLs.
 *
 * Run (dry-run, no DB writes):
 *   npx tsx scripts/scrape-professor-emails.ts --dry-run
 *
 * Run (write to DB):
 *   npx tsx scripts/scrape-professor-emails.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SS_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

// ─── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const UNI_EMAIL_DOMAINS = [
  'anu.edu.au', 'unsw.edu.au', 'uq.edu.au', 'unimelb.edu.au',
  'sydney.edu.au', 'monash.edu',
];

function extractBestEmail(html: string, professorName: string): string | null {
  const matches = html.match(EMAIL_REGEX);
  if (!matches) return null;

  // Prefer university domain emails
  const uniEmails = matches.filter(e =>
    UNI_EMAIL_DOMAINS.some(d => e.endsWith(d))
  );
  if (uniEmails.length > 0) return uniEmails[0];

  // Filter out obvious noise (noreply, support, etc.)
  const cleaned = matches.filter(e =>
    !e.includes('noreply') &&
    !e.includes('support') &&
    !e.includes('info@') &&
    !e.includes('admin@') &&
    !e.includes('webmaster') &&
    !e.includes('example.com') &&
    !e.includes('@w3.org') &&
    !e.includes('@schema.org')
  );

  return cleaned[0] ?? null;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ─── Phase 1: OpenAlex homepage_url ───────────────────────────────────────────

async function fetchOpenAlexHomepage(openAlexId: string): Promise<string | null> {
  // profile_url format: https://openalex.org/A1234567890 or https://api.openalex.org/authors/A1234567890
  const authorId = openAlexId.replace(/^.*\//, ''); // extract just the ID
  try {
    const res = await fetchWithTimeout(
      `https://api.openalex.org/authors/${authorId}?select=id,homepage_url`,
      { headers: { 'User-Agent': 'KoalaPhdResearch/1.0 (mailto:info@koalastudy.net)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.homepage_url ?? null;
  } catch {
    return null;
  }
}

// ─── Phase 2: SemanticScholar homepage ────────────────────────────────────────

async function fetchSSHomepage(ssProfileUrl: string): Promise<string | null> {
  // profile_url format: https://www.semanticscholar.org/author/Name/12345678
  const match = ssProfileUrl.match(/\/author\/[^/]+\/(\d+)/);
  if (!match) return null;
  const authorId = match[1];
  try {
    const headers: Record<string, string> = {};
    if (SS_API_KEY) headers['x-api-key'] = SS_API_KEY;
    const res = await fetchWithTimeout(
      `https://api.semanticscholar.org/graph/v1/author/${authorId}?fields=homepage`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.homepage ?? null;
  } catch {
    return null;
  }
}

// ─── Phase 3: Scrape email from homepage ─────────────────────────────────────

async function scrapeEmailFromPage(url: string, name: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KoalaBot/1.0)',
        'Accept': 'text/html',
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Skip tiny responses (JS-only pages)
    if (html.length < 500) return null;
    return extractBestEmail(html, name);
  } catch {
    return null;
  }
}

// ─── Stats tracker ────────────────────────────────────────────────────────────

interface Stats {
  total: number;
  openAlexCount: number;
  ssCount: number;
  homepageFound: number;
  emailFound: number;
  dbUpdated: number;
  errors: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Koala Professor Email Scraper ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE (will update DB)'}\n`);

  // Fetch all professors with non-null profile_url and no email yet
  console.log('Fetching professors from DB...');
  const { data: professors, error } = await supabase
    .from('professors')
    .select('id, name, profile_url, email')
    .not('profile_url', 'is', null)
    .order('id');

  if (error) {
    console.error('DB error:', error.message);
    process.exit(1);
  }

  const all = professors ?? [];
  const withoutEmail = all.filter(p => !p.email);
  const openAlexProfs = withoutEmail.filter(p => p.profile_url?.includes('openalex.org'));
  const ssProfs = withoutEmail.filter(p => p.profile_url?.includes('semanticscholar.org'));

  const stats: Stats = {
    total: withoutEmail.length,
    openAlexCount: openAlexProfs.length,
    ssCount: ssProfs.length,
    homepageFound: 0,
    emailFound: 0,
    dbUpdated: 0,
    errors: 0,
  };

  console.log(`Professors with profile_url: ${all.length}`);
  console.log(`  → already have email: ${all.length - withoutEmail.length}`);
  console.log(`  → missing email (will process): ${withoutEmail.length}`);
  console.log(`    OpenAlex: ${stats.openAlexCount}`);
  console.log(`    SemanticScholar: ${stats.ssCount}`);
  console.log('');

  if (withoutEmail.length === 0) {
    console.log('All professors already have emails. Nothing to do.');
    return;
  }

  console.log(`Starting scrape at 1 req/s (est. ${Math.ceil(withoutEmail.length / 60)} min)...\n`);

  const LOG_FILE = path.resolve(process.cwd(), 'scripts/email-scrape-results.jsonl');
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

  let processed = 0;

  for (const prof of withoutEmail) {
    processed++;
    const isOpenAlex = prof.profile_url?.includes('openalex.org');

    process.stdout.write(`[${processed}/${withoutEmail.length}] ${prof.name} ... `);

    let homepageUrl: string | null = null;

    // Phase 1 or 2: get homepage from API
    if (isOpenAlex) {
      homepageUrl = await fetchOpenAlexHomepage(prof.profile_url!);
      await sleep(1000); // 1 req/s
    } else {
      homepageUrl = await fetchSSHomepage(prof.profile_url!);
      await sleep(SS_API_KEY ? 100 : 1000); // SS: 10/s with key, 1/s without
    }

    if (!homepageUrl) {
      process.stdout.write('no homepage\n');
      logStream.write(JSON.stringify({ id: prof.id, name: prof.name, status: 'no_homepage' }) + '\n');
      continue;
    }

    stats.homepageFound++;
    process.stdout.write(`homepage found → `);

    // Phase 3: scrape email from homepage
    const email = await scrapeEmailFromPage(homepageUrl, prof.name);
    await sleep(1000);

    if (!email) {
      process.stdout.write('no email on page\n');
      logStream.write(JSON.stringify({ id: prof.id, name: prof.name, homepage: homepageUrl, status: 'no_email' }) + '\n');
      continue;
    }

    stats.emailFound++;
    process.stdout.write(`✓ ${email}\n`);
    logStream.write(JSON.stringify({ id: prof.id, name: prof.name, homepage: homepageUrl, email, status: 'found' }) + '\n');

    if (!DRY_RUN) {
      const { error: updateErr } = await supabase
        .from('professors')
        .update({ email })
        .eq('id', prof.id);
      if (updateErr) {
        console.error(`  DB update error for ${prof.id}:`, updateErr.message);
        stats.errors++;
      } else {
        stats.dbUpdated++;
      }
    }
  }

  logStream.end();

  console.log('\n=== Final Report ===');
  console.log(`Professors processed: ${stats.total}`);
  console.log(`  OpenAlex: ${stats.openAlexCount}`);
  console.log(`  SemanticScholar: ${stats.ssCount}`);
  console.log(`Homepage URLs found: ${stats.homepageFound} (${((stats.homepageFound / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Emails extracted: ${stats.emailFound} (${((stats.emailFound / stats.total) * 100).toFixed(1)}% of total)`);
  if (!DRY_RUN) {
    console.log(`DB rows updated: ${stats.dbUpdated}`);
  }
  console.log(`Errors: ${stats.errors}`);
  console.log(`\nDetailed log: ${LOG_FILE}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
