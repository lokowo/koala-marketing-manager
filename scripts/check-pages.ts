// Load .env.local
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

const BASE = 'http://localhost:3000';

interface PageCheck {
  path: string;
  name: string;
  mustContain: string[];
  mustNotContain: string[];
}

const PAGES: PageCheck[] = [
  {
    path: '/koala/home',
    name: '首页',
    mustContain: ['Koala PhD', '开始', '教授'],
    mustNotContain: ['Stanford', 'MIT', 'Harvard', '保录取', 'Error'],
  },
  {
    path: '/koala/chat',
    name: 'AI对话页',
    mustContain: ['路径评估', '科研深潜'],
    mustNotContain: ['Error'],
  },
  {
    path: '/koala/professors',
    name: '教授列表页',
    mustContain: ['教授'],
    mustNotContain: ['Stanford', 'MIT', 'Harvard', 'Error'],
  },
  {
    path: '/koala/blog',
    name: '博客工具页',
    mustContain: ['博客'],
    mustNotContain: ['Error'],
  },
  {
    path: '/koala/tools/niv',
    name: 'NIV签证评估',
    mustContain: ['签证', '准备自测', 'MARA'],
    mustNotContain: ['Error'],
  },
  {
    path: '/koala/pricing',
    name: '定价页',
    mustContain: ['19.9', 'AUD', '免费'],
    mustNotContain: ['Error'],
  },
  {
    path: '/koala/my-progress',
    name: '用户Dashboard',
    mustContain: ['进度'],
    mustNotContain: ['Error'],
  },
];

export interface PageResult {
  path: string;
  name: string;
  status: number | string;
  checks: string[];
  passed: boolean;
}

export async function checkPages(): Promise<PageResult[]> {
  const results: PageResult[] = [];

  for (const page of PAGES) {
    try {
      const resp = await fetch(`${BASE}${page.path}`, {
        signal: AbortSignal.timeout(15000),
      });
      const html = await resp.text();
      const checks: string[] = [];
      let allPassed = true;

      if (resp.status === 200) {
        checks.push('✅ HTTP 200');
      } else {
        checks.push(`❌ HTTP ${resp.status}`);
        allPassed = false;
      }

      for (const text of page.mustContain) {
        if (html.includes(text)) {
          checks.push(`✅ 包含 "${text}"`);
        } else {
          checks.push(`❌ 缺少 "${text}"`);
          allPassed = false;
        }
      }

      for (const text of page.mustNotContain) {
        if (!html.includes(text)) {
          checks.push(`✅ 不含 "${text}"`);
        } else {
          checks.push(`❌ 错误出现 "${text}"`);
          allPassed = false;
        }
      }

      results.push({ path: page.path, name: page.name, status: resp.status, checks, passed: allPassed });
    } catch (e) {
      results.push({
        path: page.path,
        name: page.name,
        status: 'CRASH',
        checks: [`❌ 页面崩溃: ${(e as Error).message}`],
        passed: false,
      });
    }
  }

  return results;
}

if (require.main === module) {
  checkPages().then(results => {
    console.log('\n📱 C端前台页面检查');
    for (const r of results) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.name} (${r.path})`);
      for (const c of r.checks.filter(c => c.startsWith('❌'))) {
        console.log(`   ${c}`);
      }
    }
    const passed = results.filter(r => r.passed).length;
    console.log(`\n${passed}/${results.length} 页面通过`);
  });
}
