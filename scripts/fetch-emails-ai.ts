import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([^=#\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '999999');

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function findEmail(name: string, university: string): Promise<{ email: string | null; currentUni: string | null; source: string }> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' } as any],
      messages: [{
        role: 'user',
        content: `Search the web and find the university email address for "${name}" who is a professor/researcher at ${university}, Australia.

Search their university staff directory page. I need their .edu.au email address.

Return ONLY in this format:
EMAIL: [their email]
UNIVERSITY: [their current university]

If you truly cannot find it after searching, return: NOT_FOUND`
      }]
    });

    // Debug: print all content blocks
    const allText: string[] = [];
    for (const block of response.content) {
      if ((block as any).type === 'text') allText.push((block as any).text);
    }
    const text = allText.join('\n').trim();
    
    const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.edu\.au/i);
    const uniMatch = text.match(/UNIVERSITY:\s*(.+)/i);
    
    if (emailMatch) {
      return { email: emailMatch[0].toLowerCase(), currentUni: uniMatch?.[1]?.trim() ?? null, source: 'ai-web-search' };
    }
    return { email: null, currentUni: null, source: 'ai-not-found' };
  } catch (e: any) {
    if (e?.status === 429) { console.log('  ⏳ Rate limited, waiting 60s...'); await sleep(60000); return findEmail(name, university); }
    return { email: null, currentUni: null, source: `ai-error: ${e?.message?.slice(0, 80)}` };
  }
}

async function main() {
  console.log('=== Koala Email Finder v3 (Sonnet + Web Search) ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Limit: ${LIMIT}\n`);

  const { data: professors, error } = await supabase.from('professors').select('id, name, university')
    .or('email.is.null,email.eq.').order('opportunity_score', { ascending: false }).limit(LIMIT);

  if (error) { console.error('DB error:', error.message); process.exit(1); }
  const profs = professors ?? [];
  console.log(`Professors without email: ${profs.length}\n`);
  if (!profs.length) { console.log('All done!'); return; }

  let found = 0, notFound = 0, moved = 0, errors = 0;

  for (let i = 0; i < profs.length; i++) {
    const prof = profs[i];
    process.stdout.write(`[${i + 1}/${profs.length}] ${prof.name} (${prof.university}) ... `);
    const result = await findEmail(prof.name, prof.university);

    if (result.email) {
      found++;
      const movedNote = result.currentUni && !result.currentUni.includes(prof.university) ? ` [MOVED → ${result.currentUni}]` : '';
      if (movedNote) moved++;
      console.log(`✅ ${result.email}${movedNote}`);
      if (!DRY_RUN) {
        const update: any = { email: result.email };
        if (result.currentUni && !result.currentUni.includes(prof.university)) update.university = result.currentUni;
        await supabase.from('professors').update(update).eq('id', prof.id);
      }
    } else {
      if (result.source.includes('error')) errors++; else notFound++;
      console.log(`✗ [${result.source}]`);
    }
    await sleep(1000);
  }

  console.log(`\nDone! Found: ${found} | Moved: ${moved} | Not found: ${notFound} | Errors: ${errors} | Total: ${profs.length}`);
}

main().catch(console.error);
