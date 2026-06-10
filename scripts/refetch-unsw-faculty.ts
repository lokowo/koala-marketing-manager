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

// 脏 faculty 判定：以头衔词+空格开头，或含连续两个及以上空格
const TITLE_RE = /^(Dr|Mr|Mrs|Ms|Miss|Prof|Professor|Doctor|Associate|Honorary|Adjunct|Emeritus|Scientia|Conjoint|Clinical|Visiting)\s/i;
const DOUBLE_SPACE_RE = /\s{2,}/;
function isDirty(faculty: string | null): boolean {
  if (!faculty) return false;
  return TITLE_RE.test(faculty) || DOUBLE_SPACE_RE.test(faculty);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type Row = { id: string; name: string | null; profile_url: string | null; faculty: string | null; research_areas: string[] | null };

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // &amp; 最后处理，避免二次解码
}

// name 与 content 属性顺序不固定，两向都尝试
function parseMeta(html: string, metaName: string): string | null {
  const escaped = metaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const forward = new RegExp(`<meta[^>]*name=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i');
  const backward = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${escaped}["']`, 'i');
  const m = html.match(forward) || html.match(backward);
  if (!m) return null;
  const v = decodeEntities(m[1]).trim();
  return v || null;
}

type FetchResult =
  | { kind: 'ok'; faculty: string | null }
  | { kind: '404' }
  | { kind: 'failed' };

async function fetchOnce(profileUrl: string): Promise<{ status: number; html: string } | 'timeout' | 'error'> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(profileUrl, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    const html = res.ok ? await res.text() : '';
    return { status: res.status, html };
  } catch {
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAndParse(profileUrl: string): Promise<FetchResult> {
  const backoff = [1000, 3000];
  for (let attempt = 0; attempt <= 2; attempt++) {
    const r = await fetchOnce(profileUrl);
    if (r === 'timeout' || r === 'error') {
      if (attempt < 2) { await sleep(backoff[attempt]); continue; }
      return { kind: 'failed' };
    }
    if (r.status === 404) return { kind: '404' };
    if (r.status >= 200 && r.status < 300) {
      const faculty = parseMeta(r.html, 'unsw.people.faculty');
      return { kind: 'ok', faculty };
    }
    // 其他非 2xx（5xx 等）：重试
    if (attempt < 2) { await sleep(backoff[attempt]); continue; }
    return { kind: 'failed' };
  }
  return { kind: 'failed' };
}

async function main() {
  // 1. 拉取候选行（university + profile_url 白名单），分页
  const candidates: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('professors')
      .select('id, name, profile_url, faculty, research_areas')
      .in('university', UNSW_VARIANTS)
      .ilike('profile_url', 'https://research.unsw.edu.au/people/%')
      .range(from, from + PAGE - 1);
    if (error) throw new Error('SELECT error: ' + error.message);
    if (!data || data.length === 0) break;
    candidates.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  // 2. 脚本内二次过滤脏 faculty，零误伤
  const targets = candidates.filter(r => r.profile_url && isDirty(r.faculty));
  const total = targets.length;
  console.log(`Candidates(UNSW research.unsw): ${candidates.length}, dirty targets: ${total}. DRY_RUN=${DRY_RUN}`);

  const snapshotPath = join(process.cwd(), 'scripts/.refetch-unsw-faculty-targets.json');
  writeFileSync(snapshotPath, JSON.stringify({
    created_at: new Date().toISOString(),
    mode: DRY_RUN ? 'DRY_RUN' : 'EXECUTE',
    total,
    targets,
  }, null, 2), 'utf8');

  let updated_faculty = 0, skipped_404 = 0, skipped_no_meta = 0, failed = 0;
  const facultyDist: Record<string, number> = {};
  const samples: Array<{ name: string | null; old_faculty: string | null; new_faculty: string | null }> = [];

  // 3. 并发池（上限 4，每请求间隔 ~250ms）
  const CONCURRENCY = 4;
  let cursor = 0;
  let processed = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= targets.length) return;
      const r = targets[idx];
      await sleep(250);
      const result = await fetchAndParse(r.profile_url!);

      if (result.kind === '404') { skipped_404++; }
      else if (result.kind === 'failed') { failed++; }
      else if (!result.faculty) { skipped_no_meta++; }
      else {
        if (!DRY_RUN) {
          const upd: any = { faculty: result.faculty, updated_at: new Date().toISOString() };
          const { error: updErr } = await db.from('professors').update(upd).eq('id', r.id);
          if (updErr) { console.error('UPDATE error', r.name, updErr.message); failed++; continue; }
        }
        updated_faculty++;
        facultyDist[result.faculty] = (facultyDist[result.faculty] || 0) + 1;
        if (samples.length < 20) {
          samples.push({ name: r.name, old_faculty: r.faculty, new_faculty: result.faculty });
        }
      }

      processed++;
      if (processed % 100 === 0) console.log(`  progress: ${processed}/${total}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 4. 报告
  const faculty_distribution = Object.entries(facultyDist)
    .sort((a, b) => b[1] - a[1])
    .map(([faculty, count]) => ({ faculty, count }));
  const report = { total, updated_faculty, skipped_404, skipped_no_meta, failed, snapshotPath, faculty_distribution, samples };
  const reportPath = join(process.cwd(), 'scripts/.refetch-unsw-faculty-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('--- SUMMARY ---');
  console.log('mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'EXECUTED (writes applied)');
  console.log('total targets:', total);
  console.log('updated_faculty:', updated_faculty);
  console.log('skipped_404:', skipped_404);
  console.log('skipped_no_meta:', skipped_no_meta);
  console.log('failed:', failed);
  console.log('snapshot written to:', snapshotPath);
  console.log('report written to:', reportPath);
  console.log('top faculty distribution:');
  for (const item of faculty_distribution.slice(0, 20)) console.log(`  ${item.faculty}: ${item.count}`);
  console.log('first 20 samples:');
  for (const s of samples) console.log(`  ${s.name}: [${s.old_faculty}] -> [${s.new_faculty}]`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
