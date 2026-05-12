import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const anthropic = new Anthropic();

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── University configs ───

interface UniversityConfig {
  name: string;
  ror: string;
  scraper: () => Promise<ScrapedProfessor[]>;
}

interface ScrapedProfessor {
  name: string;
  position: string;
  faculty: string;
  email?: string;
  profileUrl?: string;
}

interface OpenAlexAuthor {
  display_name: string;
  summary_stats?: { h_index?: number };
  works_count: number;
  cited_by_count: number;
  topics?: { display_name: string }[];
  ids?: { openalex?: string };
}

const VALID_TITLES = /\b(professor|associate\s+professor|senior\s+lecturer)\b/i;

const UNIVERSITIES: Record<string, UniversityConfig> = {
  'UNSW Sydney': {
    name: 'UNSW Sydney',
    ror: 'https://ror.org/03r8z3t63',
    scraper: scrapeUNSW,
  },
  'University of Sydney': {
    name: 'University of Sydney',
    ror: 'https://ror.org/0384j8v12',
    scraper: scrapeSydney,
  },
  'University of Melbourne': {
    name: 'University of Melbourne',
    ror: 'https://ror.org/01ej9dk98',
    scraper: scrapeMelbourne,
  },
  'Monash University': {
    name: 'Monash University',
    ror: 'https://ror.org/02bfwt286',
    scraper: scrapeMonash,
  },
  'University of Queensland': {
    name: 'University of Queensland',
    ror: 'https://ror.org/00rqy9422',
    scraper: scrapeUQ,
  },
  'Australian National University': {
    name: 'Australian National University',
    ror: 'https://ror.org/019wvm592',
    scraper: scrapeANU,
  },
  'University of Western Australia': {
    name: 'University of Western Australia',
    ror: 'https://ror.org/047272k79',
    scraper: scrapeUWA,
  },
  'University of Adelaide': {
    name: 'University of Adelaide',
    ror: 'https://ror.org/00892tw58',
    scraper: scrapeAdelaide,
  },
};

// ─── Layer 1: HTML scrapers (free) ───

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KoalaPhD-Research-Bot/1.0 (academic research aggregator)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function scrapePaginated(
  baseUrl: string,
  parsePage: ($: cheerio.CheerioAPI, url: string) => ScrapedProfessor[],
  nextPageUrl: ($: cheerio.CheerioAPI, currentUrl: string) => string | null,
  maxPages = 50,
): Promise<ScrapedProfessor[]> {
  const all: ScrapedProfessor[] = [];
  let url: string | null = baseUrl;
  let page = 0;

  while (url && page < maxPages) {
    page++;
    console.log(`    📄 Page ${page}: ${url.length > 80 ? url.slice(0, 77) + '...' : url}`);
    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      const profs = parsePage($, url);
      all.push(...profs);
      url = nextPageUrl($, url);
      if (url) await sleep(1000);
    } catch (e) {
      console.log(`    ⚠️ Page ${page} failed: ${(e as Error).message}`);
      break;
    }
  }

  return all;
}

// findanexpert.unimelb.edu.au uses a JSON API
async function scrapeMelbourne(): Promise<ScrapedProfessor[]> {
  const results: ScrapedProfessor[] = [];
  const pageSize = 50;
  let offset = 0;
  let total = Infinity;

  while (offset < total && offset < 5000) {
    const url = `https://findanexpert.unimelb.edu.au/api/persons?page=${Math.floor(offset / pageSize) + 1}&per_page=${pageSize}&order=name`;
    console.log(`    📄 API page ${Math.floor(offset / pageSize) + 1}`);
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'KoalaPhD-Research-Bot/1.0' },
      });
      if (!res.ok) {
        // Fallback to HTML scraping if API not available
        console.log(`    ⚠️ API returned ${res.status}, falling back to HTML`);
        return scrapeMelbourneHTML();
      }
      const data = await res.json();
      if (data.total) total = data.total;
      const items = data.items || data.data || [];
      if (items.length === 0) break;

      for (const item of items) {
        const title = item.position || item.title || '';
        if (!VALID_TITLES.test(title)) continue;
        results.push({
          name: item.name || item.display_name || '',
          position: extractTitle(title),
          faculty: item.organisation?.name || item.department || '',
          email: item.email || undefined,
          profileUrl: item.url || `https://findanexpert.unimelb.edu.au/profile/${item.id}`,
        });
      }
      offset += pageSize;
      await sleep(1000);
    } catch (e) {
      console.log(`    ⚠️ Melbourne API error: ${(e as Error).message}`);
      break;
    }
  }

  return results.length > 0 ? results : scrapeMelbourneHTML();
}

async function scrapeMelbourneHTML(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://findanexpert.unimelb.edu.au/browse/All',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('div.result, li.person, .researcher-item, tr').each((_, el) => {
        const name = $(el).find('a h3, a.name, .person-name, td:first-child a').first().text().trim();
        const title = $(el).find('.position, .title, td:nth-child(2)').first().text().trim();
        const faculty = $(el).find('.department, .org, td:nth-child(3)').first().text().trim();
        const href = $(el).find('a').first().attr('href') || '';
        if (name && VALID_TITLES.test(title)) {
          profs.push({
            name,
            position: extractTitle(title),
            faculty,
            profileUrl: href.startsWith('http') ? href : `https://findanexpert.unimelb.edu.au${href}`,
          });
        }
      });
      return profs;
    },
    ($) => {
      const next = $('a.next, a[rel="next"], .pagination a:contains("Next")').attr('href');
      return next ? (next.startsWith('http') ? next : `https://findanexpert.unimelb.edu.au${next}`) : null;
    },
  );
}

async function scrapeUNSW(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://research.unsw.edu.au/people?page=0',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('.view-content .views-row, .people-list .person, tr.views-row-item').each((_, el) => {
        const name = $(el).find('h3 a, .views-field-title a, .name a, td a').first().text().trim();
        const title = $(el).find('.views-field-field-position, .position, .title').first().text().trim();
        const faculty = $(el).find('.views-field-field-faculty, .faculty, .school').first().text().trim();
        const href = $(el).find('h3 a, .views-field-title a, .name a, td a').first().attr('href') || '';
        if (name && VALID_TITLES.test(title)) {
          profs.push({
            name,
            position: extractTitle(title),
            faculty,
            profileUrl: href.startsWith('http') ? href : `https://research.unsw.edu.au${href}`,
          });
        }
      });
      return profs;
    },
    ($, currentUrl) => {
      const next = $('li.pager-next a, a[rel="next"], .pager__item--next a').attr('href');
      if (!next) {
        const match = currentUrl.match(/page=(\d+)/);
        const currentPage = match ? parseInt(match[1]) : 0;
        const hasContent = $('.view-content .views-row, .people-list .person').length > 0;
        if (hasContent) return `https://research.unsw.edu.au/people?page=${currentPage + 1}`;
        return null;
      }
      return next.startsWith('http') ? next : `https://research.unsw.edu.au${next}`;
    },
  );
}

async function scrapeSydney(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://www.sydney.edu.au/research/our-researchers.html',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('.researcher-card, .staff-list-item, .result-item, .b-profile-card').each((_, el) => {
        const name = $(el).find('h3, .name, .researcher-name').first().text().trim();
        const title = $(el).find('.position, .title, .role').first().text().trim();
        const faculty = $(el).find('.faculty, .school, .department, .org-unit').first().text().trim();
        const email = $(el).find('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') || undefined;
        const href = $(el).find('a').first().attr('href') || '';
        if (name && VALID_TITLES.test(title)) {
          profs.push({
            name,
            position: extractTitle(title),
            faculty,
            email,
            profileUrl: href.startsWith('http') ? href : `https://www.sydney.edu.au${href}`,
          });
        }
      });
      return profs;
    },
    ($) => {
      const next = $('a[rel="next"], .pagination a:contains("Next"), .pager-next a').attr('href');
      return next ? (next.startsWith('http') ? next : `https://www.sydney.edu.au${next}`) : null;
    },
  );
}

async function scrapeMonash(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://research.monash.edu/en/persons/?type=%2Fdk%2Fatira%2Fpure%2Fperson%2Fpersontypes%2Fperson%2Facademic&page=0',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('.result-container .result-title, li.list-result-item').each((_, el) => {
        const linkEl = $(el).find('a').first().length ? $(el).find('a').first() : $(el).find('h3 a').first();
        const name = linkEl.text().trim() || $(el).find('.title').text().trim();
        const span = $(el).parent().find('.person-details, .rendering_person, .rendered-text').first().text().trim();
        const href = linkEl.attr('href') || '';
        if (name && VALID_TITLES.test(span)) {
          profs.push({
            name,
            position: extractTitle(span),
            faculty: '',
            profileUrl: href.startsWith('http') ? href : `https://research.monash.edu${href}`,
          });
        }
      });
      return profs;
    },
    ($, currentUrl) => {
      const next = $('a.nextLink, a[rel="next"]').attr('href');
      if (next) return next.startsWith('http') ? next : `https://research.monash.edu${next}`;
      const match = currentUrl.match(/page=(\d+)/);
      const currentPage = match ? parseInt(match[1]) : 0;
      const hasResults = $('.result-container').length > 0;
      return hasResults ? currentUrl.replace(/page=\d+/, `page=${currentPage + 1}`) : null;
    },
  );
}

async function scrapeUQ(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://researchers.uq.edu.au/browse?page=1',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('.researcher-listing .researcher-card, .views-row, .result-item').each((_, el) => {
        const name = $(el).find('h3 a, .researcher-name a, .name a').first().text().trim();
        const title = $(el).find('.position, .title, .field-position').first().text().trim();
        const faculty = $(el).find('.school, .org-unit, .field-school').first().text().trim();
        const href = $(el).find('h3 a, .researcher-name a, .name a').first().attr('href') || '';
        if (name && VALID_TITLES.test(title)) {
          profs.push({
            name,
            position: extractTitle(title),
            faculty,
            profileUrl: href.startsWith('http') ? href : `https://researchers.uq.edu.au${href}`,
          });
        }
      });
      return profs;
    },
    ($, currentUrl) => {
      const next = $('a[rel="next"], .pager-next a, li.next a').attr('href');
      if (next) return next.startsWith('http') ? next : `https://researchers.uq.edu.au${next}`;
      const match = currentUrl.match(/page=(\d+)/);
      const currentPage = match ? parseInt(match[1]) : 1;
      const hasResults = $('.researcher-card, .views-row, .result-item').length > 0;
      return hasResults ? currentUrl.replace(/page=\d+/, `page=${currentPage + 1}`) : null;
    },
  );
}

async function scrapeANU(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://researchers.anu.edu.au/browse?page=1',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('.researcher-item, .views-row, .result-item, .staff-list-item').each((_, el) => {
        const name = $(el).find('h3 a, .name a, a.researcher-name').first().text().trim();
        const title = $(el).find('.position, .title, .role').first().text().trim();
        const faculty = $(el).find('.school, .college, .department').first().text().trim();
        const href = $(el).find('h3 a, .name a, a.researcher-name').first().attr('href') || '';
        if (name && VALID_TITLES.test(title)) {
          profs.push({
            name,
            position: extractTitle(title),
            faculty,
            profileUrl: href.startsWith('http') ? href : `https://researchers.anu.edu.au${href}`,
          });
        }
      });
      return profs;
    },
    ($, currentUrl) => {
      const next = $('a[rel="next"], .pager-next a').attr('href');
      if (next) return next.startsWith('http') ? next : `https://researchers.anu.edu.au${next}`;
      const match = currentUrl.match(/page=(\d+)/);
      const currentPage = match ? parseInt(match[1]) : 1;
      const hasResults = $('.researcher-item, .views-row, .result-item').length > 0;
      return hasResults ? currentUrl.replace(/page=\d+/, `page=${currentPage + 1}`) : null;
    },
  );
}

async function scrapeUWA(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://research-repository.uwa.edu.au/en/persons/?type=%2Fdk%2Fatira%2Fpure%2Fperson%2Fpersontypes%2Fperson%2Facademic&page=0',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('.result-container, li.list-result-item').each((_, el) => {
        const linkEl = $(el).find('.result-title a, h3 a').first();
        const name = linkEl.text().trim();
        const details = $(el).find('.person-details, .rendering_person').first().text().trim();
        const href = linkEl.attr('href') || '';
        if (name && VALID_TITLES.test(details)) {
          profs.push({
            name,
            position: extractTitle(details),
            faculty: '',
            profileUrl: href.startsWith('http') ? href : `https://research-repository.uwa.edu.au${href}`,
          });
        }
      });
      return profs;
    },
    ($, currentUrl) => {
      const next = $('a.nextLink, a[rel="next"]').attr('href');
      if (next) return next.startsWith('http') ? next : `https://research-repository.uwa.edu.au${next}`;
      const match = currentUrl.match(/page=(\d+)/);
      const currentPage = match ? parseInt(match[1]) : 0;
      const hasResults = $('.result-container, li.list-result-item').length > 0;
      return hasResults ? currentUrl.replace(/page=\d+/, `page=${currentPage + 1}`) : null;
    },
  );
}

async function scrapeAdelaide(): Promise<ScrapedProfessor[]> {
  return scrapePaginated(
    'https://researchers.adelaide.edu.au/browse?page=1',
    ($) => {
      const profs: ScrapedProfessor[] = [];
      $('.researcher-item, .views-row, .result-item, .staff-card').each((_, el) => {
        const name = $(el).find('h3 a, .name a, a.researcher-name').first().text().trim();
        const title = $(el).find('.position, .title, .role').first().text().trim();
        const faculty = $(el).find('.school, .faculty, .department').first().text().trim();
        const href = $(el).find('h3 a, .name a, a.researcher-name').first().attr('href') || '';
        if (name && VALID_TITLES.test(title)) {
          profs.push({
            name,
            position: extractTitle(title),
            faculty,
            profileUrl: href.startsWith('http') ? href : `https://researchers.adelaide.edu.au${href}`,
          });
        }
      });
      return profs;
    },
    ($, currentUrl) => {
      const next = $('a[rel="next"], .pager-next a').attr('href');
      if (next) return next.startsWith('http') ? next : `https://researchers.adelaide.edu.au${next}`;
      const match = currentUrl.match(/page=(\d+)/);
      const currentPage = match ? parseInt(match[1]) : 1;
      const hasResults = $('.researcher-item, .views-row, .result-item').length > 0;
      return hasResults ? currentUrl.replace(/page=\d+/, `page=${currentPage + 1}`) : null;
    },
  );
}

function extractTitle(text: string): string {
  const m = text.match(/\b(Professor|Associate\s+Professor|Senior\s+Lecturer)\b/i);
  if (!m) return text.trim();
  const t = m[0].toLowerCase();
  if (t === 'professor') return 'Professor';
  if (t.includes('associate')) return 'Associate Professor';
  return 'Senior Lecturer';
}

// ─── Layer 2: OpenAlex enrichment (free) ───

async function enrichWithOpenAlex(
  professors: ScrapedProfessor[],
  ror: string,
): Promise<Map<string, { h_index: number | null; paper_count: number | null; citation_count: number | null; topics: string[] }>> {
  const enriched = new Map<string, { h_index: number | null; paper_count: number | null; citation_count: number | null; topics: string[] }>();
  const batchSize = 5;

  for (let i = 0; i < professors.length; i += batchSize) {
    const batch = professors.slice(i, i + batchSize);
    const promises = batch.map(async (prof) => {
      try {
        const url = `https://api.openalex.org/authors?search=${encodeURIComponent(prof.name)}&filter=last_known_institutions.ror:${ror}&per_page=1&mailto=info@koalastudy.net`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const results = data.results as OpenAlexAuthor[] | undefined;
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
  }

  console.log(`  📊 OpenAlex: enriched ${enriched.size}/${professors.length} professors`);
  return enriched;
}

// ─── Layer 3: Claude Haiku for missing research areas (cheap) ───

async function fillResearchAreas(
  name: string,
  university: string,
  faculty: string,
): Promise<string[]> {
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
  openAlexData: Map<string, { h_index: number | null; paper_count: number | null; citation_count: number | null; topics: string[] }>,
) {
  let saved = 0;
  let updated = 0;
  let haikuCalls = 0;

  for (const prof of professors) {
    if (!prof.name || prof.name.length < 2) continue;

    const oaData = openAlexData.get(prof.name);
    let researchAreas = oaData?.topics?.length ? oaData.topics : [];

    // Layer 3: fill missing research areas with Haiku
    if (researchAreas.length === 0 && prof.faculty) {
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

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (prof.email) updates.email = prof.email;
      if (prof.position) updates.position_title = prof.position;
      if (prof.faculty) updates.faculty = prof.faculty;
      if (prof.profileUrl) updates.profile_url = prof.profileUrl;
      if (researchAreas.length > 0) updates.research_areas = researchAreas;
      if (oaData?.h_index && (!existing.h_index || oaData.h_index > existing.h_index)) {
        updates.h_index = oaData.h_index;
        updates.paper_count = oaData.paper_count;
        updates.citation_count = oaData.citation_count;
      }
      updates.verification_status = 'Verified';
      updates.data_sources = ['university_website', 'openalex'];
      await supabase.from('professors').update(updates).eq('id', existing.id);
      updated++;
    } else {
      const { error } = await supabase.from('professors').insert({
        name: prof.name,
        university,
        position_title: prof.position,
        faculty: prof.faculty || null,
        email: prof.email || null,
        research_areas: researchAreas,
        profile_url: prof.profileUrl || null,
        h_index: oaData?.h_index ?? null,
        paper_count: oaData?.paper_count ?? null,
        citation_count: oaData?.citation_count ?? null,
        verification_status: 'Verified',
        data_sources: ['university_website', 'openalex'],
      });
      if (error) {
        if (error.code !== '23505') console.error(`    ❌ ${prof.name}: ${error.message}`);
      } else {
        saved++;
      }
    }
  }

  console.log(`  💾 New: ${saved}, Updated: ${updated}, Haiku calls: ${haikuCalls}`);
  return { saved, updated, haikuCalls };
}

// ─── Main ───

async function processUniversity(config: UniversityConfig) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🏫 ${config.name}`);
  console.log(`${'='.repeat(50)}`);

  // Layer 1: scrape HTML
  console.log(`\n  🔍 Layer 1: Scraping university website...`);
  const professors = await config.scraper();
  console.log(`  ✅ Layer 1: Found ${professors.length} professors/assoc professors/senior lecturers`);

  if (professors.length === 0) {
    console.log(`  ⚠️ No professors found — site structure may have changed. Skipping.`);
    return;
  }

  // Layer 2: enrich with OpenAlex
  console.log(`\n  📊 Layer 2: Enriching with OpenAlex...`);
  const openAlexData = await enrichWithOpenAlex(professors, config.ror);

  // Layer 3 + save (Haiku called inside saveToDatabase for missing research areas)
  console.log(`\n  💾 Layer 3 + Save: Writing to database...`);
  await saveToDatabase(professors, config.name, openAlexData);

  // Stats
  const { count } = await supabase
    .from('professors')
    .select('*', { count: 'exact', head: true })
    .eq('university', config.name)
    .eq('verification_status', 'Verified');
  console.log(`  📊 Total verified professors for ${config.name}: ${count}`);
}

async function main() {
  const target = process.argv[2];

  if (!target) {
    console.log('Usage:');
    console.log('  npx tsx scripts/scrape-professors-v2.ts "UNSW Sydney"');
    console.log('  npx tsx scripts/scrape-professors-v2.ts all');
    console.log(`\nAvailable: ${Object.keys(UNIVERSITIES).join(', ')}`);
    return;
  }

  console.log('🐨 Koala PhD — Professor Scraper v2 (3-layer: HTML + OpenAlex + Haiku)\n');

  if (target === 'all') {
    for (const config of Object.values(UNIVERSITIES)) {
      await processUniversity(config);
    }
  } else {
    const config = UNIVERSITIES[target];
    if (!config) {
      console.error(`University "${target}" not found.\nAvailable: ${Object.keys(UNIVERSITIES).join(', ')}`);
      process.exit(1);
    }
    await processUniversity(config);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
