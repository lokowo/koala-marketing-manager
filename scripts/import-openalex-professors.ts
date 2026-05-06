/**
 * OpenAlex Professor Import Script
 *
 * Imports active researchers from Australian universities into the professors table.
 * Filters: works_count > 30, cited_by_count > 300
 *
 * Usage: npm run import:professors
 *        npm run import:professors -- --clean   (cleanup low-quality openalex data first)
 *
 * Before running, execute these SQL statements in Supabase SQL Editor to merge
 * duplicate university names:
 *
 *   UPDATE professors SET university = 'University of Sydney'
 *     WHERE university = 'The University of Sydney';
 *   UPDATE professors SET university = 'Queensland University of Technology'
 *     WHERE university = 'Queensland University of Technology (QUT)';
 *   UPDATE professors SET university = 'UNSW Sydney'
 *     WHERE university = 'UNSW Sydney (University of New South Wales)';
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const OPENALEX_BASE = 'https://api.openalex.org';
const EMAIL = 'koalaphd@gmail.com';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const AUSTRALIAN_UNIVERSITIES: { name: string; openalex_id: string }[] = [
  { name: 'University of Adelaide', openalex_id: 'I1140994' },
  { name: 'Queensland University of Technology', openalex_id: 'I120865392' },
  { name: 'University of Technology Sydney', openalex_id: 'I24243819' },
  { name: 'RMIT University', openalex_id: 'I161705842' },
  { name: 'Macquarie University', openalex_id: 'I64834324' },
  { name: 'Deakin University', openalex_id: 'I154425062' },
  { name: 'Griffith University', openalex_id: 'I74532625' },
  { name: 'Curtin University', openalex_id: 'I45129264' },
  { name: 'Swinburne University of Technology', openalex_id: 'I186015286' },
  { name: 'University of Wollongong', openalex_id: 'I198034042' },
  { name: 'La Trobe University', openalex_id: 'I8867420' },
  { name: 'Flinders University', openalex_id: 'I73824291' },
  { name: 'University of Newcastle', openalex_id: 'I187960308' },
  { name: 'University of Tasmania', openalex_id: 'I7578756' },
  { name: 'Western Sydney University', openalex_id: 'I119124557' },
  { name: 'James Cook University', openalex_id: 'I109935604' },
  { name: 'Charles Sturt University', openalex_id: 'I76098891' },
  { name: 'University of Canberra', openalex_id: 'I93461324' },
  { name: 'Murdoch University', openalex_id: 'I110410053' },
  { name: 'Victoria University', openalex_id: 'I28014988' },
  { name: 'University of the Sunshine Coast', openalex_id: 'I87438085' },
  { name: 'Edith Cowan University', openalex_id: 'I131195918' },
  { name: 'Australian Catholic University', openalex_id: 'I203408880' },
  { name: 'Bond University', openalex_id: 'I153535908' },
  { name: 'Central Queensland University', openalex_id: 'I123614790' },
  { name: 'Southern Cross University', openalex_id: 'I116804381' },
  { name: 'University of New England', openalex_id: 'I43240578' },
  { name: 'Federation University Australia', openalex_id: 'I53319239' },
  { name: 'Charles Darwin University', openalex_id: 'I12043993' },
  { name: 'University of Southern Queensland', openalex_id: 'I100682428' },
  { name: 'Torrens University', openalex_id: 'I4210167034' },
];

interface OpenAlexAuthor {
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats?: { h_index?: number };
  topics?: { display_name: string }[];
  ids?: { openalex?: string; orcid?: string };
}

interface OpenAlexResponse {
  results?: OpenAlexAuthor[];
  meta?: { count?: number; next_cursor?: string | null };
}

async function verifyOrFixId(uni: { name: string; openalex_id: string }): Promise<boolean> {
  const checkUrl = `${OPENALEX_BASE}/institutions/${uni.openalex_id}?mailto=${EMAIL}`;
  const checkRes = await fetch(checkUrl);

  if (checkRes.ok) {
    const inst = await checkRes.json();
    console.log(`  Verified: ${uni.name} -> ${inst.display_name} (${uni.openalex_id})`);
    return true;
  }

  console.log(`  ID invalid for ${uni.name}, searching...`);
  const searchUrl = `${OPENALEX_BASE}/institutions?search=${encodeURIComponent(uni.name)}&filter=country_code:AU&mailto=${EMAIL}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (searchData.results?.[0]) {
    const correctId = (searchData.results[0].id as string).replace('https://openalex.org/', '');
    console.log(`  Fixed ID: ${uni.openalex_id} -> ${correctId}`);
    uni.openalex_id = correctId;
    return true;
  }

  console.log(`  SKIP: ${uni.name} - not found in OpenAlex`);
  return false;
}

async function fetchAuthorsForInstitution(institutionId: string, universityName: string): Promise<number> {
  let cursor: string | null = '*';
  let totalImported = 0;

  while (cursor) {
    const url = `${OPENALEX_BASE}/authors?filter=last_known_institutions.id:${institutionId},works_count:>30,cited_by_count:>300&per_page=200&cursor=${cursor}&mailto=${EMAIL}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`  API error ${res.status} for ${universityName}, stopping`);
      break;
    }

    const data: OpenAlexResponse = await res.json();
    if (!data.results || data.results.length === 0) break;

    for (const author of data.results) {
      const prof = {
        name: author.display_name,
        university: universityName,
        h_index: author.summary_stats?.h_index ?? null,
        paper_count: author.works_count ?? null,
        citation_count: author.cited_by_count ?? null,
        research_areas: (author.topics || []).slice(0, 5).map(t => t.display_name),
        profile_url: author.ids?.orcid || null,
        google_scholar_url: null,
        email: null,
        position_title: null,
        faculty: null,
        grant_status: 'Pending',
        verification_status: 'Pending',
        opportunity_score: 0,
        semantic_scholar_id: author.ids?.openalex || null,
        data_sources: ['openalex'],
        suitable_student_backgrounds: [] as string[],
        potential_rp_topics: [] as string[],
      };

      const { data: existing } = await supabase
        .from('professors')
        .select('id')
        .eq('name', prof.name)
        .eq('university', prof.university)
        .maybeSingle();

      if (existing) {
        await supabase.from('professors')
          .update({
            h_index: prof.h_index,
            paper_count: prof.paper_count,
            citation_count: prof.citation_count,
            research_areas: prof.research_areas,
            data_sources: prof.data_sources,
          })
          .eq('id', existing.id);
      } else {
        const { error } = await supabase.from('professors').insert(prof);
        if (error) {
          console.error(`  Insert failed for ${prof.name}: ${error.message}`);
        }
      }
    }

    totalImported += data.results.length;
    console.log(`  ${universityName}: imported ${totalImported} / ${data.meta?.count || '?'}`);

    cursor = data.meta?.next_cursor || null;
    await sleep(200);
  }

  return totalImported;
}

async function cleanupLowQuality() {
  console.log('=== Cleanup: removing low-quality OpenAlex imports (h_index < 15) ===\n');
  const { count, error } = await supabase
    .from('professors')
    .delete({ count: 'exact' })
    .contains('data_sources', ['openalex'])
    .lt('h_index', 15);

  if (error) {
    console.error(`Cleanup error: ${error.message}`);
  } else {
    console.log(`Deleted ${count} low-quality OpenAlex professors\n`);
  }
}

async function main() {
  console.log('=== OpenAlex Professor Import ===\n');

  if (process.argv.includes('--clean')) {
    await cleanupLowQuality();
  }

  console.log('Step 1: Verifying institution IDs...\n');
  const validUnis: typeof AUSTRALIAN_UNIVERSITIES = [];
  for (const uni of AUSTRALIAN_UNIVERSITIES) {
    const ok = await verifyOrFixId(uni);
    if (ok) validUnis.push(uni);
    await sleep(100);
  }
  console.log(`\nVerified ${validUnis.length} / ${AUSTRALIAN_UNIVERSITIES.length} universities\n`);

  console.log('Step 2: Importing authors...\n');
  let grandTotal = 0;
  for (const uni of validUnis) {
    console.log(`\nImporting: ${uni.name} (${uni.openalex_id})`);
    const count = await fetchAuthorsForInstitution(`https://openalex.org/${uni.openalex_id}`, uni.name);
    console.log(`  Done: ${count} professors`);
    grandTotal += count;
  }

  const { count } = await supabase.from('professors').select('*', { count: 'exact', head: true });
  console.log(`\n=== Import complete ===`);
  console.log(`Imported this run: ${grandTotal}`);
  console.log(`Total professors in database: ${count}`);
}

main().catch(console.error);
