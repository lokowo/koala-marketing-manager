import { config } from 'dotenv';
config({ path: '.env.local' });
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const USYD = 'University of Sydney (USYD)';
const USYD_VARIANTS = ['University of Sydney (USYD)', 'The University of Sydney', 'University of Sydney'];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

type Raw = {
  name: string; title: string; position: string; department: string;
  category: string; research_tags: string; bio: string;
  num_publications: number; num_grants: number; profile_url: string;
};

function mapFaculty(category: string): string {
  if (category === 'School of Civil Engineering') return 'Faculty of Engineering - Civil Engineering';
  if (category === 'School of Electrical and Computer Engineering') return 'Faculty of Engineering - Electrical and Information Engineering';
  return 'Faculty of Engineering and IT';
}
function splitTags(rt: string): string[] {
  if (!rt || !rt.trim()) return [];
  return rt.split(';').map(s => s.trim()).filter(Boolean);
}

async function main() {
  const path = join(process.cwd(), 'professor-data/usyd_engineering_staff.json');
  const rows: Raw[] = JSON.parse(readFileSync(path, 'utf8'));
  console.log(`Loaded ${rows.length} records. DRY_RUN=${DRY_RUN}`);

  let toInsert = 0, toUpdate = 0, ambiguous = 0, errors = 0;
  const facultyDist: Record<string, number> = {};
  const ambiguousNames: string[] = [];

  for (const r of rows) {
    const name = (r.name || '').trim();
    const faculty = mapFaculty(r.category);
    facultyDist[faculty] = (facultyDist[faculty] || 0) + 1;

    const transformed = {
      name,
      university: USYD,
      title: (r.title || '').trim() || null,
      position_title: (r.position || '').trim() || null,
      faculty,
      research_areas: splitTags(r.research_tags),
      paper_count: (r.num_publications ?? null),
      profile_url: (r.profile_url || '').trim() || null,
      ai_bio_en: (r.bio || '').trim() || null,
      grant_status: 'Pending',
      verification_status: 'Pending',
      data_sources: ['university_website'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: matches, error: selErr } = await db
      .from('professors')
      .select('id, title, position_title, paper_count, ai_bio_en, research_areas')
      .in('university', USYD_VARIANTS)
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
        if (ex.paper_count == null && transformed.paper_count != null) upd.paper_count = transformed.paper_count;
        if (ex.ai_bio_en == null && transformed.ai_bio_en) upd.ai_bio_en = transformed.ai_bio_en;
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
