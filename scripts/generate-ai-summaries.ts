/**
 * Batch-generate AI summaries for professors that don't have one yet.
 * Uses Claude Haiku with the same prompt as the lazy-load API route.
 *
 * Usage: npx tsx scripts/generate-ai-summaries.ts
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const candidates = [
  resolve(__dirname, '..', '.env.local'),
  resolve(process.cwd(), '.env.local'),
  '/Users/jhe/Desktop/koala-marketing-manager/.env.local',
];
for (const envPath of candidates) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
    console.log(`Loaded env from: ${envPath}`);
    break;
  } catch { /* try next */ }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(prof: Record<string, unknown>): string {
  const areas = (prof.research_areas as string[] ?? []).join('、');
  return `请用中文写2-3句话介绍以下澳洲大学教授，面向准备申请PhD的学生。要求自然流畅，突出对申请者的参考价值。不要使用"该教授"开头，直接用姓名。

教授信息：
- 姓名：${prof.name}
- 大学：${prof.university}
- 职位：${prof.position_title || '未知'}
- 研究方向：${areas || '未知'}
- H-Index：${prof.h_index ?? '未知'}
- 论文数量：${prof.paper_count ?? '未知'}
- 引用次数：${prof.citation_count ?? '未知'}
- 经费状态：${prof.grant_status === 'Active' ? '有活跃经费' : '未知'}
- 招生状态：${prof.accepting_students === 'yes' ? '正在招生' : prof.accepting_students === 'likely' ? '可能招生' : '未知'}

只输出介绍文字，不要加标题或格式。`;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const { data: professors, error } = await db
    .from('professors')
    .select('id, name, university, position_title, research_areas, h_index, paper_count, citation_count, grant_status, accepting_students')
    .is('ai_summary', null)
    .order('opportunity_score', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Failed to fetch professors:', error.message);
    process.exit(1);
  }

  if (!professors || professors.length === 0) {
    console.log('All professors already have AI summaries.');
    return;
  }

  console.log(`Found ${professors.length} professors without AI summary.\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < professors.length; i++) {
    const prof = professors[i];
    try {
      const response = await claude.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: buildPrompt(prof) }],
      });

      const summary = response.content[0].type === 'text' ? response.content[0].text.trim() : null;

      if (summary) {
        await db.from('professors').update({ ai_summary: summary }).eq('id', prof.id);
        success++;
        console.log(`[${i + 1}/${professors.length}] ✓ ${prof.name} (${prof.university})`);
      } else {
        failed++;
        console.log(`[${i + 1}/${professors.length}] ✗ ${prof.name} — empty response`);
      }
    } catch (e) {
      failed++;
      console.log(`[${i + 1}/${professors.length}] ✗ ${prof.name} — ${(e as Error).message}`);
    }

    if (i < professors.length - 1) await sleep(200);
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
}

main();
