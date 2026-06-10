import { config } from 'dotenv';
config({ path: '.env.local' });

import { writeFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.env.DRY_RUN === 'true';

const UNSW_VARIANTS = [
  'University of New South Wales (UNSW)',
  'UNSW Sydney',
  'University of New South Wales (UNSW Sydney)',
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BAD_FACULTY_RE = /^(Dr|Mr|Mrs|Ms|Miss|Prof|Professor|Assistant|AdjAssocProf|Doctor|Associate|Honorary|Adjunct|Emeritus|Scientia|Conjoint|Clinical|Visiting)\s/i;

type Row = {
  id: string;
  name: string | null;
  university: string | null;
  faculty: string | null;
  position_title: string | null;
  verification_status: string | null;
  profile_url: string | null;
  updated_at: string | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseMeta(html: string, metaName: string): string | null {
  const escaped = metaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const forward = new RegExp(`<meta[^>]*name=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i');
  const backward = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${escaped}["']`, 'i');
  const m = html.match(forward) || html.match(backward);
  if (!m) return null;
  const v = decodeEntities(m[1]).trim();
  return v || null;
}

function isValidFaculty(v: string | null): v is string {
  if (!v) return false;
  if (BAD_FACULTY_RE.test(v)) return false;
  if (/\s{2,}/.test(v)) return false;
  if (/[<>]/.test(v)) return false;
  if (/^https?:/i.test(v)) return false;
  return v.length <= 120;
}

async function fetchFaculty(profileUrl: string): Promise<{ faculty: string | null; status: number | 'error' }> {
  try {
    const res = await fetch(profileUrl, { headers: { 'User-Agent': UA } });
    if (!res.ok) return { faculty: null, status: res.status };
    const html = await res.text();
    return { faculty: parseMeta(html, 'unsw.people.faculty'), status: res.status };
  } catch {
    return { faculty: null, status: 'error' };
  }
}

async function main() {
  const { data, error } = await db
    .from('professors')
    .select('id, name, university, faculty, position_title, verification_status, profile_url, updated_at')
    .in('university', UNSW_VARIANTS)
    .ilike('profile_url', 'https://research.unsw.edu.au/people/%')
    .or('faculty.ilike.Assistant Professor %,faculty.ilike.AdjAssocProf %,faculty.is.null')
    .order('name');

  if (error) throw new Error('SELECT error: ' + error.message);

  const targets = (data ?? []) as Row[];
  const snapshotPath = join(process.cwd(), 'scripts/.fix-unsw-faculty-blind-spots-targets.json');
  writeFileSync(snapshotPath, JSON.stringify({
    created_at: new Date().toISOString(),
    mode: DRY_RUN ? 'DRY_RUN' : 'EXECUTE',
    total: targets.length,
    targets,
  }, null, 2), 'utf8');

  let updated = 0;
  let invalid_meta = 0;
  let failed = 0;
  const samples: Array<{ id: string; name: string | null; old_faculty: string | null; new_faculty: string | null; status: number | 'error' }> = [];

  for (const row of targets) {
    if (!row.profile_url) {
      failed++;
      continue;
    }

    const result = await fetchFaculty(row.profile_url);
    samples.push({ id: row.id, name: row.name, old_faculty: row.faculty, new_faculty: result.faculty, status: result.status });

    if (result.status !== 200) {
      failed++;
      continue;
    }
    if (!isValidFaculty(result.faculty)) {
      invalid_meta++;
      continue;
    }

    if (!DRY_RUN) {
      const { error: updateError } = await db
        .from('professors')
        .update({ faculty: result.faculty, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updateError) {
        console.error('UPDATE error', row.name, updateError.message);
        failed++;
        continue;
      }
    }
    updated++;
  }

  const report = {
    total: targets.length,
    updated,
    invalid_meta,
    failed,
    snapshotPath,
    samples,
  };
  const reportPath = join(process.cwd(), 'scripts/.fix-unsw-faculty-blind-spots-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('--- SUMMARY ---');
  console.log('mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'EXECUTED (writes applied)');
  console.log('total targets:', targets.length);
  console.log('updated:', updated);
  console.log('invalid_meta:', invalid_meta);
  console.log('failed:', failed);
  console.log('snapshot written to:', snapshotPath);
  console.log('report written to:', reportPath);
  for (const s of samples) console.log(`  ${s.name}: [${s.old_faculty}] -> [${s.new_faculty}] status=${s.status}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
