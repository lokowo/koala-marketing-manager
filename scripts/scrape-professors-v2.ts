import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import * as https from 'https';
import * as constants from 'constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const anthropic = new Anthropic();

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Types ───

interface ScrapedProfessor {
  name: string;
  position: string;
  faculty: string;
  email?: string;
  profileUrl?: string;
  researchAreas?: string[];
}

interface OpenAlexEnrichment {
  h_index: number | null;
  paper_count: number | null;
  citation_count: number | null;
  topics: string[];
}

interface UniversityConfig {
  name: string;
  ror: string;
  scraper: (limit?: number) => Promise<ScrapedProfessor[]>;
}

// ─── Title filtering ───
// ✅ Professor, Associate Professor, Senior Lecturer, Lecturer, Emeritus Professor
// ❌ PhD Student, Postdoc, Research Fellow/Assistant, Tutor, Adjunct-only

const VALID_TITLES = /\b(emeritus\s+professor|professor|associate\s+professor|senior\s+lecturer|lecturer)\b/i;

const EXCLUDED_TITLES = /\b(phd\s+(student|candidate)|postdoc|postdoctoral|research\s+(fellow|assistant)|tutor|teaching\s+assistant|higher\s+degree\s+by\s+research)\b/i;

function isValidTitle(text: string): boolean {
  if (EXCLUDED_TITLES.test(text)) return false;
  return VALID_TITLES.test(text);
}

function extractTitle(text: string): string {
  const lower = text.toLowerCase();
  if (/emeritus\s+professor/i.test(lower)) return 'Emeritus Professor';
  if (/associate\s+professor/i.test(lower)) return 'Associate Professor';
  if (/\bprofessor\b/i.test(lower)) return 'Professor';
  if (/senior\s+lecturer/i.test(lower)) return 'Senior Lecturer';
  if (/\blecturer\b/i.test(lower)) return 'Lecturer';
  return text.trim();
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^(emeritus\s+professor|associate\s+professor|professor|senior\s+lecturer|lecturer|dr|mr|mrs|ms|miss|mx)\s+/i, '')
    .trim();
}

// ─── Layer 1: University HTML scrapers ───

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KoalaPhD-Research-Bot/1.0 (academic research aggregator; info@koalastudy.net)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// Adelaide's server uses legacy SSL renegotiation which Node.js fetch rejects
async function fetchPageLegacySSL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': 'KoalaPhD-Research-Bot/1.0 (academic research aggregator; info@koalastudy.net)' },
      secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT,
    };
    https.get(options, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// --- UNSW Sydney ---
// research.unsw.edu.au/researcher?page=N
// Structure: .views-row > .info > a.title[href="/people/..."], <b>Faculty:</b> <a>, FoR links
async function scrapeUNSW(limit?: number): Promise<ScrapedProfessor[]> {
  const all: ScrapedProfessor[] = [];
  let page = 0;
  const maxPages = limit ? Math.ceil(limit / 25) + 1 : 200;

  while (page < maxPages) {
    const url = `https://research.unsw.edu.au/researcher?page=${page}`;
    console.log(`    📄 Page ${page + 1}: ${url}`);
    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      const rows = $('.views-row');
      if (rows.length === 0) break;

      rows.each((_, el) => {
        if (limit && all.length >= limit) return;
        const info = $(el).find('.info');
        const nameLink = info.find('a.title');
        const rawName = nameLink.text().trim();
        const href = nameLink.attr('href') || '';

        // The name includes title prefix: "Associate Professor Shengyu Li"
        // Check if name contains valid title, or check bio for position
        const bio = info.find('.bio').text().trim();
        const combinedText = rawName + ' ' + bio;

        if (!isValidTitle(combinedText)) return;

        const name = cleanName(rawName);
        if (!name || name.length < 2) return;

        const position = extractTitle(combinedText);
        const facultyLink = info.find('b:contains("Faculty")').parent().find('a').first();
        const faculty = facultyLink.text().trim();

        const forLinks: string[] = [];
        const forSection = info.find('b:contains("Fields of Research")');
        if (forSection.length) {
          forSection.parent().find('a').each((_, a) => {
            const t = $(a).text().trim();
            if (t) forLinks.push(t);
          });
        }

        all.push({
          name,
          position,
          faculty,
          profileUrl: href.startsWith('http') ? href : `https://research.unsw.edu.au${href}`,
          researchAreas: forLinks.slice(0, 5),
        });
      });

      if (limit && all.length >= limit) break;
      page++;
      await sleep(1000);
    } catch (e) {
      console.log(`    ⚠️ Page ${page + 1} failed: ${(e as Error).message}`);
      break;
    }
  }
  return all;
}

// --- University of Adelaide ---
// researchers.adelaide.edu.au?page=N
// Structure: .au-rp-card > .card-body > h3.card-title > a, .card-text > p (position, college)
async function scrapeAdelaide(limit?: number): Promise<ScrapedProfessor[]> {
  const all: ScrapedProfessor[] = [];
  let page = 0;
  const maxPages = limit ? Math.ceil(limit / 16) + 1 : 350;

  while (page < maxPages) {
    const url = `https://researchers.adelaide.edu.au?page=${page}`;
    console.log(`    📄 Page ${page + 1}: ${url}`);
    try {
      const html = await fetchPageLegacySSL(url);
      const $ = cheerio.load(html);
      const cards = $('.au-rp-card');
      if (cards.length === 0) break;

      cards.each((_, el) => {
        if (limit && all.length >= limit) return;
        const rawName = $(el).find('.card-title a').text().trim();
        const href = $(el).find('.card-title a').attr('href') || '';
        const paragraphs = $(el).find('.card-text p');
        const positionText = paragraphs.first().text().trim();
        const college = paragraphs.eq(1).text().trim();

        if (!isValidTitle(rawName + ' ' + positionText)) return;

        const name = cleanName(rawName);
        if (!name || name.length < 2) return;

        all.push({
          name,
          position: extractTitle(positionText || rawName),
          faculty: college,
          profileUrl: href.startsWith('http') ? href : `https://researchers.adelaide.edu.au${href}`,
        });
      });

      if (limit && all.length >= limit) break;
      page++;
      await sleep(1000);
    } catch (e) {
      console.log(`    ⚠️ Page ${page + 1} failed: ${(e as Error).message}`);
      break;
    }
  }
  return all;
}

// --- Fallback: OpenAlex-only scraper ---
// For universities whose websites block scraping (Sydney, Melbourne, Monash, UQ, ANU, UWA)
// Uses OpenAlex with stricter filters: h_index > 5 (active academics, not students)
async function scrapeViaOpenAlex(ror: string, university: string, limit?: number): Promise<ScrapedProfessor[]> {
  const all: ScrapedProfessor[] = [];
  const perPage = 200;
  let cursor = '*';
  let page = 0;

  while (cursor) {
    page++;
    const url = `https://api.openalex.org/authors?filter=last_known_institutions.ror:${ror},summary_stats.h_index:>5&per_page=${perPage}&cursor=${cursor}&sort=cited_by_count:desc&select=id,display_name,works_count,cited_by_count,summary_stats,topics,last_known_institutions,orcid&mailto=info@koalastudy.net`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.log(`    ⚠️ OpenAlex page ${page}: HTTP ${res.status}`);
        break;
      }
      const data = await res.json();
      const results = data.results || [];

      if (results.length === 0) break;

      for (const author of results) {
        if (limit && all.length >= limit) break;
        const name = author.display_name?.trim();
        if (!name || name.length < 2) continue;

        const topics = (author.topics || []).slice(0, 5).map((t: { display_name: string }) => t.display_name);

        all.push({
          name,
          position: 'Researcher',
          faculty: '',
          researchAreas: topics,
        });
      }

      const total = data.meta?.count || 0;
      console.log(`    📄 Page ${page}: +${results.length} (${all.length}/${total})`);

      if (limit && all.length >= limit) break;
      cursor = data.meta?.next_cursor || null;
      if (!cursor) break;
      await sleep(500);
    } catch (e) {
      console.log(`    ⚠️ OpenAlex page ${page} error: ${(e as Error).message}`);
      break;
    }
  }
  return limit ? all.slice(0, limit) : all;
}

// ─── University configs ───

const UNIVERSITIES: Record<string, UniversityConfig> = {
  'UNSW Sydney': {
    name: 'UNSW Sydney',
    ror: 'https://ror.org/03r8z3t63',
    scraper: scrapeUNSW,
  },
  'University of Adelaide': {
    name: 'University of Adelaide',
    ror: 'https://ror.org/00892tw58',
    scraper: scrapeAdelaide,
  },
  // Websites blocked (JS SPA / bot detection / Elsevier Pure 403) → OpenAlex fallback
  'University of Sydney': {
    name: 'University of Sydney',
    ror: 'https://ror.org/0384j8v12',
    scraper: (limit) => scrapeViaOpenAlex('https://ror.org/0384j8v12', 'University of Sydney', limit),
  },
  'University of Melbourne': {
    name: 'University of Melbourne',
    ror: 'https://ror.org/01ej9dk98',
    scraper: (limit) => scrapeViaOpenAlex('https://ror.org/01ej9dk98', 'University of Melbourne', limit),
  },
  'Monash University': {
    name: 'Monash University',
    ror: 'https://ror.org/02bfwt286',
    scraper: (limit) => scrapeViaOpenAlex('https://ror.org/02bfwt286', 'Monash University', limit),
  },
  'University of Queensland': {
    name: 'University of Queensland',
    ror: 'https://ror.org/00rqy9422',
    scraper: (limit) => scrapeViaOpenAlex('https://ror.org/00rqy9422', 'University of Queensland', limit),
  },
  'Australian National University': {
    name: 'Australian National University',
    ror: 'https://ror.org/019wvm592',
    scraper: (limit) => scrapeViaOpenAlex('https://ror.org/019wvm592', 'Australian National University', limit),
  },
  'University of Western Australia': {
    name: 'University of Western Australia',
    ror: 'https://ror.org/047272k79',
    scraper: (limit) => scrapeViaOpenAlex('https://ror.org/047272k79', 'University of Western Australia', limit),
  },
};

// ─── Layer 2: OpenAlex enrichment ───

async function enrichWithOpenAlex(
  professors: ScrapedProfessor[],
  ror: string,
): Promise<Map<string, OpenAlexEnrichment>> {
  const enriched = new Map<string, OpenAlexEnrichment>();
  const batchSize = 5;

  for (let i = 0; i < professors.length; i += batchSize) {
    const batch = professors.slice(i, i + batchSize);
    const promises = batch.map(async (prof) => {
      try {
        const url = `https://api.openalex.org/authors?search=${encodeURIComponent(prof.name)}&filter=last_known_institutions.ror:${ror}&per_page=1&mailto=info@koalastudy.net`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const results = data.results;
        if (!results?.length) return;
        const author = results[0];
        enriched.set(prof.name, {
          h_index: author.summary_stats?.h_index ?? null,
          paper_count: author.works_count ?? null,
          citation_count: author.cited_by_count ?? null,
          topics: (author.topics || []).slice(0, 5).map((t: { display_name: string }) => t.display_name),
        });
      } catch { /* skip */ }
    });
    await Promise.all(promises);
    if (i + batchSize < professors.length) await sleep(200);
    if ((i + batchSize) % 50 === 0) {
      console.log(`    📊 OpenAlex: ${enriched.size}/${Math.min(i + batchSize, professors.length)} enriched`);
    }
  }

  console.log(`  📊 OpenAlex: enriched ${enriched.size}/${professors.length}`);
  return enriched;
}

// ─── Layer 3: Claude Haiku for missing research areas ───

async function fillResearchAreas(name: string, university: string, faculty: string): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Professor ${name}, ${university}, ${faculty}.\nList their 3 main research areas as a JSON array of strings.\nOnly return the JSON array, nothing else.`,
      }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const areas = JSON.parse(match[0]) as string[];
      return areas.filter(a => typeof a === 'string').slice(0, 3);
    }
  } catch { /* skip */ }
  return [];
}

// ─── Database save ───

async function saveToDatabase(
  professors: ScrapedProfessor[],
  university: string,
  openAlexData: Map<string, OpenAlexEnrichment>,
  skipHaiku: boolean,
  isOpenAlexSource: boolean,
) {
  let saved = 0;
  let updated = 0;
  let haikuCalls = 0;

  for (let i = 0; i < professors.length; i++) {
    const prof = professors[i];
    if (!prof.name || prof.name.length < 2) continue;

    const oaData = openAlexData.get(prof.name);

    let researchAreas = prof.researchAreas?.length ? prof.researchAreas : oaData?.topics || [];

    if (!skipHaiku && researchAreas.length === 0 && prof.faculty) {
      researchAreas = await fillResearchAreas(prof.name, university, prof.faculty);
      haikuCalls++;
      if (haikuCalls % 10 === 0) await sleep(500);
    }

    const { data: existing } = await supabase
      .from('professors')
      .select('id, research_areas, h_index')
      .eq('name', prof.name)
      .eq('university', university)
      .maybeSingle();

    const dataSources = isOpenAlexSource ? ['openalex'] : ['university_website', 'openalex'];

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (prof.email) updates.email = prof.email;
      if (prof.position && prof.position !== 'Researcher') updates.position_title = prof.position;
      if (prof.faculty) updates.faculty = prof.faculty;
      if (prof.profileUrl) updates.profile_url = prof.profileUrl;
      if (researchAreas.length > 0 && (!existing.research_areas || existing.research_areas.length === 0)) {
        updates.research_areas = researchAreas;
      }
      const hIndex = oaData?.h_index;
      if (hIndex && (!existing.h_index || hIndex > existing.h_index)) {
        updates.h_index = hIndex;
        updates.paper_count = oaData?.paper_count;
        updates.citation_count = oaData?.citation_count;
      }
      updates.verification_status = 'Verified';
      updates.data_sources = dataSources;
      updates.last_synced_at = new Date().toISOString();
      await supabase.from('professors').update(updates).eq('id', existing.id);
      updated++;
    } else {
      const { error } = await supabase.from('professors').insert({
        name: prof.name,
        university,
        position_title: prof.position || 'Researcher',
        faculty: prof.faculty || null,
        email: prof.email || null,
        research_areas: researchAreas,
        profile_url: prof.profileUrl || null,
        h_index: oaData?.h_index ?? null,
        paper_count: oaData?.paper_count ?? null,
        citation_count: oaData?.citation_count ?? null,
        verification_status: 'Verified',
        data_sources: dataSources,
        last_synced_at: new Date().toISOString(),
      });
      if (error) {
        if (error.code !== '23505') console.error(`    ❌ ${prof.name}: ${error.message}`);
      } else {
        saved++;
      }
    }

    if ((i + 1) % 50 === 0) {
      console.log(`    💾 Progress: ${i + 1}/${professors.length} (New: ${saved}, Updated: ${updated})`);
    }
  }

  console.log(`  💾 Final: New: ${saved}, Updated: ${updated}, Haiku calls: ${haikuCalls}`);
  return { saved, updated, haikuCalls };
}

// ─── Main ───

async function processUniversity(config: UniversityConfig, skipHaiku: boolean, limit?: number) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏫 ${config.name}`);
  console.log(`${'='.repeat(60)}`);

  const isOpenAlexSource = !['UNSW Sydney', 'University of Adelaide'].includes(config.name);

  // Layer 1: Scrape professor list
  console.log(`\n  🔍 Layer 1: ${isOpenAlexSource ? 'OpenAlex (website blocked)' : 'University website'}...`);
  const professors = await config.scraper(limit);
  console.log(`  ✅ Layer 1 complete: ${professors.length} professors found`);

  if (professors.length === 0) {
    console.log(`  ⚠️ No professors found. Skipping.`);
    return;
  }

  // Layer 2: OpenAlex enrichment (skip for OpenAlex-sourced universities)
  let openAlexData = new Map<string, OpenAlexEnrichment>();
  if (!isOpenAlexSource) {
    console.log(`\n  📊 Layer 2: OpenAlex enrichment...`);
    openAlexData = await enrichWithOpenAlex(professors, config.ror);
  }

  // Layer 3 + save
  console.log(`\n  💾 Layer 3: Saving to database${skipHaiku ? ' (Haiku skipped)' : ''}...`);
  await saveToDatabase(professors, config.name, openAlexData, skipHaiku, isOpenAlexSource);

  const { count } = await supabase
    .from('professors')
    .select('*', { count: 'exact', head: true })
    .eq('university', config.name)
    .eq('verification_status', 'Verified');
  console.log(`  📊 Total verified for ${config.name}: ${count}`);
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith('--'));
  const skipHaiku = args.includes('--skip-haiku');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || limitArg.replace('--limit', '').trim() || '0') || undefined : undefined;

  if (!target) {
    console.log('🐨 Koala PhD — Professor Scraper v2');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx scripts/scrape-professors-v2.ts "UNSW Sydney"');
    console.log('  npx tsx scripts/scrape-professors-v2.ts all');
    console.log('  npx tsx scripts/scrape-professors-v2.ts "UNSW Sydney" --limit=50');
    console.log('  npx tsx scripts/scrape-professors-v2.ts all --skip-haiku');
    console.log('');
    console.log('Data sources:');
    console.log('  🌐 HTML scraping: UNSW Sydney, University of Adelaide');
    console.log('  📊 OpenAlex API:  Sydney, Melbourne, Monash, UQ, ANU, UWA (websites blocked)');
    console.log('');
    console.log(`Available: ${Object.keys(UNIVERSITIES).join(', ')}`);
    return;
  }

  console.log('🐨 Koala PhD — Professor Scraper v2\n');
  console.log('Layer 1: University website HTML / OpenAlex (for blocked sites)');
  console.log('Layer 2: OpenAlex enrichment (h-index, papers, citations)');
  console.log('Layer 3: Claude Haiku (missing research areas)\n');
  if (skipHaiku) console.log('⏭️  Haiku enrichment: SKIPPED\n');
  if (limit) console.log(`🔢 Limit: ${limit} professors per university\n`);

  const { count: before } = await supabase
    .from('professors')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'Verified');
  console.log(`📊 Database before: ${before} verified professors\n`);

  if (target === 'all') {
    for (const config of Object.values(UNIVERSITIES)) {
      await processUniversity(config, skipHaiku, limit);
      await sleep(3000);
    }
  } else {
    const config = UNIVERSITIES[target];
    if (!config) {
      console.error(`University "${target}" not found.\nAvailable: ${Object.keys(UNIVERSITIES).join(', ')}`);
      process.exit(1);
    }
    await processUniversity(config, skipHaiku, limit);
  }

  const { count: after } = await supabase
    .from('professors')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'Verified');
  console.log(`\n📊 Database after: ${after} verified professors`);
  console.log(`📈 Net change: +${(after || 0) - (before || 0)}`);
  console.log('\n✅ Done!');
}

main().catch(console.error);
