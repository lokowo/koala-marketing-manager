import { config } from 'dotenv';
config({ path: '.env.local' });
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const UNSW = 'University of New South Wales (UNSW)';
const UNSW_VARIANTS = [
  'University of New South Wales (UNSW)',
  'UNSW Sydney',
  'University of New South Wales (UNSW Sydney)',
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

type Raw = {
  full_name: string; profile_url: string; summary: string;
  first_name: string; last_name: string; role: string;
  faculty: string; school: string; email: string;
  phone: string | null; photo_url: string; biography: string;
};

const HON = new Set(['professor','prof','doctor','dr','mr','mrs','ms','miss',
  'associate','assistant','senior','lecturer','honorary','adjunct','adj',
  'emeritus','scientia','visiting','conjoint','clinical','a/prof']);

function splitName(full: string): { name: string; title: string | null } {
  let s = (full || '').replace(/\./g, '. ').replace(/\s+/g, ' ').trim();
  const tokens = s.split(' ');
  const prefix: string[] = [];
  while (tokens.length > 1) {
    const t = tokens[0].replace(/\.$/, '').toLowerCase();
    if (HON.has(t)) prefix.push(tokens.shift()!);
    else break;
  }
  return { name: tokens.join(' ').trim(), title: prefix.join(' ').trim() || null };
}

function mapFaculty(school: string): string {
  let sch = (school || '').trim();
  if (sch.includes('|')) sch = sch.split('|').pop()!.trim();
  if (!sch || sch.toLowerCase() === 'faculty unit') return 'Faculty of Engineering and IT';
  return 'Engineering - ' + sch;
}

async function main() {
  const path = join(process.cwd(), 'professor-data/engineering_staff_full.json');
  const raw = readFileSync(path, 'utf8');
  const cleaned = raw.replace(/,(\s*[}\]])/g, '$1');  // 去尾随逗号
  const rows: Raw[] = JSON.parse(cleaned);
  console.log(`Loaded ${rows.length} records. DRY_RUN=${DRY_RUN}`);

  let toInsert = 0, toUpdate = 0, ambiguous = 0, errors = 0;
  const facultyDist: Record<string, number> = {};
  const ambiguousNames: string[] = [];

  for (const r of rows) {
    const { name, title } = splitName(r.full_name);
    if (!name) { console.warn('EMPTY name from', r.full_name); errors++; continue; }
    const faculty = mapFaculty(r.school);
    facultyDist[faculty] = (facultyDist[faculty] || 0) + 1;
    const email = (r.email || '').trim() || null;

    const transformed: any = {
      name,
      university: UNSW,
      title,
      position_title: (r.role || '').trim() || null,
      faculty,
      research_areas: [],
      email,
      email_source: email ? 'university_website' : null,
      profile_url: (r.profile_url || '').trim() || null,
      ai_bio_en: (r.biography || '').trim() || null,
      grant_status: 'Pending',
      verification_status: 'Pending',
      data_sources: ['university_website'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: matches, error: selErr } = await db
      .from('professors')
      .select('id, title, position_title, email, email_source, ai_bio_en, profile_url, research_areas')
      .in('university', UNSW_VARIANTS)
      .ilike('name', name);

    if (selErr) { console.error('SELECT error', name, selErr.message); errors++; continue; }

    if (matches && matches.length > 1) {
      ambiguous++; ambiguousNames.push(`${name} (${matches.length})`);
      continue;
    }

    if (matches && matches.length === 1) {
      toUpdate++;
      if (!DRY_RUN) {
        const ex: any = matches[0];
        const upd: any = { updated_at: new Date().toISOString() };
        if (ex.title == null && transformed.title) upd.title = transformed.title;
        if (ex.position_title == null && transformed.position_title) upd.position_title = transformed.position_title;
        if (ex.email == null && transformed.email) { upd.email = transformed.email; upd.email_source = 'university_website'; }
        if (ex.ai_bio_en == null && transformed.ai_bio_en) upd.ai_bio_en = transformed.ai_bio_en;
        if (ex.profile_url == null && transformed.profile_url) upd.profile_url = transformed.profile_url;
        if ((!ex.research_areas || ex.research_areas.length === 0) && transformed.research_areas.length > 0) upd.research_areas = transformed.research_areas;
        const { error: updErr } = await db.from('professors').update(upd).eq('id', ex.id);
        if (updErr) { console.error('UPDATE error', name, updErr.message); errors++; }
      }
    } else {
      toInsert++;
      if (!DRY_RUN) {
        const { error: insErr } = await db.from('professors').insert(transformed);
        if (insErr) { console.error('INSERT error', name, insErr.message); errors++; }
      }
    }
  }

  console.log('--- SUMMARY ---');
  console.log('mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'EXECUTED (writes applied)');
  console.log('to INSERT:', toInsert);
  console.log('to UPDATE:', toUpdate);
  console.log('AMBIGUOUS skipped:', ambiguous, ambiguousNames);
  console.log('errors:', errors);
  console.log('faculty distribution:', facultyDist);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
