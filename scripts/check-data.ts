function loadEnv() {
  try {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.trim().match(/^([^=#\s][^=]*)=(.*)$/);
      if (m) (process.env as Record<string, string | undefined>)[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
}
loadEnv();

const REQUIRED_TABLES = [
  'professors', 'grants', 'papers', 'leads',
  'ai_conversations', 'feedback', 'blog_posts',
  'knowledge_chunks', 'user_credits', 'outreach_emails',
  'user_achievements', 'daily_tasks', 'professor_matches',
  'followup_reminders', 'sensitive_words',
];

export interface DataResult {
  name: string;
  passed: boolean;
  value: string;
  fix?: string;
}

export async function checkData(): Promise<DataResult[]> {
  const results: DataResult[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    results.push({ name: 'Supabase 连接', passed: false, value: '环境变量未配置', fix: '设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY' });
    return results;
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(url, key);

  // Check each required table
  for (const table of REQUIRED_TABLES) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        results.push({ name: `表 ${table}`, passed: false, value: `错误: ${error.message}`, fix: '在 Supabase SQL Editor 运行 schema.sql' });
      } else {
        results.push({ name: `表 ${table}`, passed: true, value: `${count ?? 0} 条记录` });
      }
    } catch (e) {
      results.push({ name: `表 ${table}`, passed: false, value: (e as Error).message });
    }
  }

  // Check professors has data
  try {
    const { count } = await supabase.from('professors').select('*', { count: 'exact', head: true });
    if ((count ?? 0) === 0) {
      results.push({ name: '教授数据', passed: false, value: '0条', fix: '运行 professor_collector.py 采集教授数据' });
    } else {
      results.push({ name: '教授数据', passed: true, value: `${count} 条` });
    }
  } catch {}

  // Check knowledge_chunks
  try {
    const { count } = await supabase.from('knowledge_chunks').select('*', { count: 'exact', head: true });
    if ((count ?? 0) === 0) {
      results.push({ name: '知识库数据', passed: false, value: '0条', fix: '运行 knowledge_builder.js 构建知识库' });
    } else {
      results.push({ name: '知识库数据', passed: true, value: `${count} 条` });
    }
  } catch {}

  // Check pgvector function
  try {
    const { data } = await supabase.rpc('match_knowledge', {
      query_embedding: new Array(1536).fill(0),
      match_threshold: 0.99,
      match_count: 1,
    });
    results.push({ name: 'pgvector match_knowledge 函数', passed: true, value: `可调用 (返回 ${(data ?? []).length} 条)` });
  } catch (e) {
    results.push({ name: 'pgvector match_knowledge 函数', passed: false, value: (e as Error).message, fix: '在 Supabase SQL Editor 运行 supabase/functions.sql' });
  }

  return results;
}

if (require.main === module) {
  checkData().then(results => {
    console.log('\n💾 数据完整性检查');
    for (const r of results) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.name}: ${r.value}${r.fix ? ` — fix: ${r.fix}` : ''}`);
    }
    const passed = results.filter(r => r.passed).length;
    console.log(`\n${passed}/${results.length} 项通过`);
  });
}
