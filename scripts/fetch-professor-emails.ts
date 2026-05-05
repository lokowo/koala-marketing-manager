/**
 * fetch-professor-emails.ts
 *
 * Strategy: search each university's staff directory API directly by professor name.
 * Unlike scrape-professor-emails.ts (which follows profile_url from OpenAlex/SS),
 * this script targets professors with no profile_url or non-API profile URLs.
 *
 * University approaches:
 *  - Melbourne (findanexpert): JSON search API
 *  - Monash, UWA, Adelaide (Pure system): /en/persons/?search=&format=json
 *  - UQ: researchers.uq.edu.au search + profile HTML scrape
 *  - Sydney: staff.sydney.edu.au profile HTML scrape
 *  - UNSW: research.unsw.edu.au profile HTML scrape
 *  - ANU: researchers.anu.edu.au profile HTML scrape
 *  - Fallback: fetch existing profile_url and regex-extract email
 *
 * Rate limit: 1 req/sec to avoid being banned.
 *
 * Usage:
 *   npx tsx scripts/fetch-professor-emails.ts --dry-run --limit 50
 *   npx tsx scripts/fetch-professor-emails.ts --limit 200
 *   npx tsx scripts/fetch-professor-emails.ts           # all professors
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit=') || process.argv[process.argv.indexOf(a) - 1] === '--limit');
const LIMIT = LIMIT_ARG
  ? parseInt(LIMIT_ARG.replace('--limit=', ''), 10) || parseInt(process.argv[process.argv.indexOf('--limit') + 1] || '999999', 10)
  : 999999;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(edu\.au|anu\.edu\.au|unsw\.edu\.au|uq\.edu\.au|unimelb\.edu\.au|sydney\.edu\.au|monash\.edu|uwa\.edu\.au|adelaide\.edu\.au)\b/gi;
const GENERIC_EMAIL_REGEX = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;
const NOISE_PATTERNS = /noreply|no-reply|support|info@|admin@|webmaster|example\.|@w3\.|@schema\.|privacy|legal|library|help@|enquir/i;

function extractEmail(html: string, uniDomain?: string): string | null {
  // 1. Try edu.au specific email
  const uniMatches = html.match(EMAIL_REGEX) ?? [];
  if (uniDomain) {
    const domainMatch = uniMatches.find(e => e.toLowerCase().includes(uniDomain.toLowerCase()));
    if (domainMatch) return domainMatch.toLowerCase();
  }
  if (uniMatches.length > 0) return uniMatches[0].toLowerCase();

  // 2. Fallback: any email not matching noise patterns
  const allMatches = html.match(GENERIC_EMAIL_REGEX) ?? [];
  const cleaned = allMatches.filter(e => !NOISE_PATTERNS.test(e));
  return cleaned[0]?.toLowerCase() ?? null;
}

async function fetchHtml(url: string, timeoutMs = 12000): Promise<string | null> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/json,*/*',
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

// ─── University-specific fetchers ─────────────────────────────────────────────

type FetchResult = { email: string | null; source: string };

// Melbourne: findanexpert.unimelb.edu.au — has a proper JSON search API
async function fetchMelbourne(name: string): Promise<FetchResult> {
  const q = encodeURIComponent(name);
  const url = `https://findanexpert.unimelb.edu.au/api/search?q=${q}&rows=1&start=0`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'KoalaBot/1.0' },
    });
    if (!res.ok) return { email: null, source: 'melbourne-api-error' };
    const data = await res.json();
    const person = data?.results?.[0];
    if (!person) return { email: null, source: 'melbourne-not-found' };

    // Check name match (fuzzy: last name matches)
    const lastName = name.split(' ').pop()?.toLowerCase() ?? '';
    const resultName = (person.name ?? '').toLowerCase();
    if (!resultName.includes(lastName)) return { email: null, source: 'melbourne-name-mismatch' };

    const email = person.email ?? null;
    if (email) return { email: email.toLowerCase(), source: 'findanexpert-api' };

    // Try fetching the profile page
    if (person.url) {
      await sleep(1000);
      const html = await fetchHtml(`https://findanexpert.unimelb.edu.au${person.url}`);
      if (html) {
        const extracted = extractEmail(html, 'unimelb.edu.au');
        if (extracted) return { email: extracted, source: 'findanexpert-profile' };
      }
    }
    return { email: null, source: 'melbourne-no-email' };
  } catch {
    return { email: null, source: 'melbourne-exception' };
  }
}

// Pure research system (Monash, UWA, Adelaide): /en/persons/?search=&format=json
async function fetchPure(baseUrl: string, name: string, domain: string): Promise<FetchResult> {
  const q = encodeURIComponent(name);
  const url = `${baseUrl}/en/persons/?search=${q}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'KoalaBot/1.0' },
    });
    if (!res.ok) return { email: null, source: `${domain}-api-error` };
    const data = await res.json();

    const items: { name?: { text?: string }; electronicAddresses?: { value: string; type?: { uri?: string } }[]; link?: string }[]
      = data?.items ?? data?.results ?? [];
    if (!items.length) return { email: null, source: `${domain}-not-found` };

    const lastName = name.split(' ').pop()?.toLowerCase() ?? '';

    for (const item of items.slice(0, 3)) {
      const itemName = item.name?.text?.toLowerCase() ?? '';
      if (!itemName.includes(lastName)) continue;

      // Check electronicAddresses
      const emailAddr = item.electronicAddresses?.find(a =>
        a.type?.uri?.includes('email') || a.value?.includes('@')
      );
      if (emailAddr?.value) {
        const email = emailAddr.value.replace(/mailto:/i, '').trim().toLowerCase();
        if (email.includes('@')) return { email, source: `${domain}-pure-api` };
      }

      // Fallback: fetch profile page
      if (item.link) {
        await sleep(1000);
        const profileUrl = item.link.startsWith('http') ? item.link : `${baseUrl}${item.link}`;
        const html = await fetchHtml(profileUrl);
        if (html) {
          const extracted = extractEmail(html, domain);
          if (extracted) return { email: extracted, source: `${domain}-pure-profile` };
        }
      }
    }
    return { email: null, source: `${domain}-no-email` };
  } catch {
    return { email: null, source: `${domain}-exception` };
  }
}

// UQ: search + scrape profile HTML
async function fetchUQ(name: string, profileUrl?: string | null): Promise<FetchResult> {
  // Try existing profile URL first
  if (profileUrl?.includes('researchers.uq.edu.au')) {
    const html = await fetchHtml(profileUrl);
    if (html) {
      const email = extractEmail(html, 'uq.edu.au');
      if (email) return { email, source: 'uq-profile-url' };
    }
    await sleep(1000);
  }

  // Search UQ researchers
  const q = encodeURIComponent(name);
  const searchHtml = await fetchHtml(`https://researchers.uq.edu.au/research/researchers?q=${q}`);
  if (!searchHtml) return { email: null, source: 'uq-search-error' };

  // Extract first profile link
  const profileMatch = searchHtml.match(/href="(\/researcher\/[^"]+)"/);
  if (!profileMatch) return { email: null, source: 'uq-not-found' };

  await sleep(1000);
  const profileHtml = await fetchHtml(`https://researchers.uq.edu.au${profileMatch[1]}`);
  if (!profileHtml) return { email: null, source: 'uq-profile-error' };

  const lastName = name.split(' ').pop()?.toLowerCase() ?? '';
  if (!profileHtml.toLowerCase().includes(lastName)) return { email: null, source: 'uq-name-mismatch' };

  const email = extractEmail(profileHtml, 'uq.edu.au');
  return { email, source: email ? 'uq-profile-scrape' : 'uq-no-email' };
}

// Sydney: staff directory search
async function fetchSydney(name: string, profileUrl?: string | null): Promise<FetchResult> {
  if (profileUrl?.includes('sydney.edu.au')) {
    const html = await fetchHtml(profileUrl);
    if (html) {
      const email = extractEmail(html, 'sydney.edu.au');
      if (email) return { email, source: 'sydney-profile-url' };
    }
    await sleep(1000);
  }

  // Try Sydney staff directory search
  const parts = name.split(' ');
  const lastName = parts[parts.length - 1];
  const q = encodeURIComponent(lastName);
  const html = await fetchHtml(`https://www.sydney.edu.au/research/find-a-researcher.html?q=${q}`);
  if (!html) return { email: null, source: 'sydney-search-error' };

  // Extract links to researcher profiles
  const profileLinks = [...html.matchAll(/href="(\/research\/researchers\/[^"]+)"/g)].map(m => m[1]);
  const nameLower = name.toLowerCase();

  for (const link of profileLinks.slice(0, 3)) {
    await sleep(1000);
    const profHtml = await fetchHtml(`https://www.sydney.edu.au${link}`);
    if (!profHtml) continue;
    if (!profHtml.toLowerCase().includes(lastName.toLowerCase())) continue;
    const email = extractEmail(profHtml, 'sydney.edu.au');
    if (email) return { email, source: 'sydney-profile-scrape' };
  }

  return { email: null, source: 'sydney-not-found' };
}

// UNSW: research.unsw.edu.au/people search
async function fetchUNSW(name: string, profileUrl?: string | null): Promise<FetchResult> {
  if (profileUrl?.includes('unsw.edu.au')) {
    const html = await fetchHtml(profileUrl);
    if (html) {
      const email = extractEmail(html, 'unsw.edu.au');
      if (email) return { email, source: 'unsw-profile-url' };
    }
    await sleep(1000);
  }

  const q = encodeURIComponent(name);
  const html = await fetchHtml(`https://research.unsw.edu.au/people?q=${q}`);
  if (!html) return { email: null, source: 'unsw-search-error' };

  const lastName = name.split(' ').pop()?.toLowerCase() ?? '';
  const profileLinks = [...html.matchAll(/href="(\/people\/[^"]+)"/g)].map(m => m[1]);

  for (const link of profileLinks.slice(0, 3)) {
    await sleep(1000);
    const profHtml = await fetchHtml(`https://research.unsw.edu.au${link}`);
    if (!profHtml) continue;
    if (!profHtml.toLowerCase().includes(lastName)) continue;
    const email = extractEmail(profHtml, 'unsw.edu.au');
    if (email) return { email, source: 'unsw-profile-scrape' };
  }
  return { email: null, source: 'unsw-not-found' };
}

// ANU: researchers.anu.edu.au search
async function fetchANU(name: string, profileUrl?: string | null): Promise<FetchResult> {
  if (profileUrl?.includes('anu.edu.au')) {
    const html = await fetchHtml(profileUrl);
    if (html) {
      const email = extractEmail(html, 'anu.edu.au');
      if (email) return { email, source: 'anu-profile-url' };
    }
    await sleep(1000);
  }

  const q = encodeURIComponent(name);
  const html = await fetchHtml(`https://researchers.anu.edu.au/researchers?q=${q}`);
  if (!html) return { email: null, source: 'anu-search-error' };

  const lastName = name.split(' ').pop()?.toLowerCase() ?? '';
  const profileLinks = [...html.matchAll(/href="(\/researchers\/[^"?]+)"/g)].map(m => m[1]);

  for (const link of profileLinks.slice(0, 3)) {
    if (link === '/researchers') continue;
    await sleep(1000);
    const profHtml = await fetchHtml(`https://researchers.anu.edu.au${link}`);
    if (!profHtml) continue;
    if (!profHtml.toLowerCase().includes(lastName)) continue;
    const email = extractEmail(profHtml, 'anu.edu.au');
    if (email) return { email, source: 'anu-profile-scrape' };
  }
  return { email: null, source: 'anu-not-found' };
}

// Generic: try existing profile_url if it's a direct university URL
async function fetchFromProfileUrl(profileUrl: string, uniDomain?: string): Promise<FetchResult> {
  const html = await fetchHtml(profileUrl);
  if (!html || html.length < 500) return { email: null, source: 'profile-url-empty' };
  const email = extractEmail(html, uniDomain);
  return { email, source: email ? 'direct-profile-url' : 'profile-url-no-email' };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const UNI_MAP: Record<string, { domain: string; fetch: (name: string, profileUrl?: string | null) => Promise<FetchResult> }> = {
  'University of Melbourne':          { domain: 'unimelb.edu.au',  fetch: (n) => fetchMelbourne(n) },
  'Monash University':                { domain: 'monash.edu',       fetch: (n) => fetchPure('https://research.monash.edu', n, 'monash.edu') },
  'University of Western Australia':  { domain: 'uwa.edu.au',       fetch: (n) => fetchPure('https://research-repository.uwa.edu.au', n, 'uwa.edu.au') },
  'University of Adelaide':           { domain: 'adelaide.edu.au',  fetch: (n) => fetchPure('https://researchers.adelaide.edu.au', n, 'adelaide.edu.au') },
  'University of Queensland':         { domain: 'uq.edu.au',        fetch: (n, u) => fetchUQ(n, u) },
  'University of Sydney':             { domain: 'sydney.edu.au',    fetch: (n, u) => fetchSydney(n, u) },
  'UNSW Sydney':                      { domain: 'unsw.edu.au',      fetch: (n, u) => fetchUNSW(n, u) },
  'Australian National University':   { domain: 'anu.edu.au',       fetch: (n, u) => fetchANU(n, u) },
};

async function getEmail(
  name: string,
  university: string,
  profileUrl?: string | null,
): Promise<FetchResult> {
  // If existing profile_url is a direct university page (not OpenAlex/SS), try it first
  if (
    profileUrl &&
    !profileUrl.includes('openalex.org') &&
    !profileUrl.includes('semanticscholar.org') &&
    !profileUrl.includes('orcid.org')
  ) {
    const uniEntry = Object.values(UNI_MAP).find(u =>
      profileUrl.toLowerCase().includes(u.domain)
    );
    const result = await fetchFromProfileUrl(profileUrl, uniEntry?.domain);
    await sleep(1000);
    if (result.email) return result;
  }

  // Try university-specific method
  const uniKey = Object.keys(UNI_MAP).find(k =>
    university.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(university.toLowerCase())
  );

  if (uniKey) {
    await sleep(1000);
    return UNI_MAP[uniKey].fetch(name, profileUrl);
  }

  // Unknown university — try generic profile URL scrape
  if (profileUrl && !profileUrl.includes('openalex.org') && !profileUrl.includes('semanticscholar.org')) {
    const result = await fetchFromProfileUrl(profileUrl);
    await sleep(1000);
    return result;
  }

  return { email: null, source: 'university-not-supported' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limitN = limitArg ? parseInt(limitArg.split('=')[1], 10) : (
    args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 999999
  );

  console.log('\n=== Koala Professor Email Fetcher (University Directory) ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE (will update DB)'}`);
  console.log(`Limit: ${limitN === 999999 ? 'all' : limitN} professors\n`);

  const { data: professors, error } = await supabase
    .from('professors')
    .select('id, name, university, profile_url, email')
    .or('email.is.null,email.eq.')
    .order('opportunity_score', { ascending: false })
    .limit(limitN);

  if (error) {
    console.error('DB error:', error.message);
    process.exit(1);
  }

  const profs = professors ?? [];
  console.log(`Professors without email: ${profs.length}`);

  // Show university breakdown
  const uniCounts: Record<string, number> = {};
  for (const p of profs) {
    uniCounts[p.university] = (uniCounts[p.university] ?? 0) + 1;
  }
  for (const [uni, count] of Object.entries(uniCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    const supported = Object.keys(UNI_MAP).some(k => uni.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(uni.toLowerCase()));
    console.log(`  ${supported ? '✓' : '?'} ${uni}: ${count}`);
  }
  console.log('');

  if (!profs.length) {
    console.log('No professors to process.');
    return;
  }

  const LOG_FILE = path.resolve(process.cwd(), 'scripts/fetch-emails-results.jsonl');
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

  let found = 0;
  let notFound = 0;
  let updated = 0;
  let errors = 0;
  const sourceStats: Record<string, number> = {};

  for (let i = 0; i < profs.length; i++) {
    const prof = profs[i];
    process.stdout.write(`[${i + 1}/${profs.length}] ${prof.name} (${prof.university}) ... `);

    let result: FetchResult;
    try {
      result = await getEmail(prof.name, prof.university, prof.profile_url);
    } catch (err) {
      result = { email: null, source: 'unexpected-error' };
      errors++;
      process.stdout.write(`ERROR: ${err}\n`);
    }

    sourceStats[result.source] = (sourceStats[result.source] ?? 0) + 1;

    if (result.email) {
      found++;
      process.stdout.write(`✓ ${result.email} [${result.source}]\n`);
      logStream.write(JSON.stringify({ id: prof.id, name: prof.name, university: prof.university, email: result.email, source: result.source, ts: new Date().toISOString() }) + '\n');

      if (!DRY_RUN) {
        const { error: updateErr } = await supabase
          .from('professors')
          .update({ email: result.email, email_source: result.source } as Record<string, unknown>)
          .eq('id', prof.id);
        if (updateErr) {
          // email_source column may not exist; try without it
          const { error: updateErr2 } = await supabase
            .from('professors')
            .update({ email: result.email })
            .eq('id', prof.id);
          if (updateErr2) {
            console.error(`  DB error: ${updateErr2.message}`);
            errors++;
          } else {
            updated++;
          }
        } else {
          updated++;
        }
      }
    } else {
      notFound++;
      process.stdout.write(`✗ [${result.source}]\n`);
      logStream.write(JSON.stringify({ id: prof.id, name: prof.name, university: prof.university, email: null, source: result.source, ts: new Date().toISOString() }) + '\n');
    }
  }

  logStream.end();

  const total = profs.length;
  const rate = total > 0 ? ((found / total) * 100).toFixed(1) : '0.0';

  console.log('\n=== Results ===');
  console.log(`Total processed : ${total}`);
  console.log(`Emails found    : ${found} (${rate}%)`);
  console.log(`Not found       : ${notFound}`);
  if (!DRY_RUN) console.log(`DB updated      : ${updated}`);
  console.log(`Errors          : ${errors}`);

  console.log('\n=== Source breakdown ===');
  for (const [src, cnt] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src.padEnd(35)} ${cnt}`);
  }

  console.log(`\nDetailed log: ${LOG_FILE}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
