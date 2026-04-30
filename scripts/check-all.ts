import { checkPages } from './check-pages';
import { checkApis } from './check-api';
import { checkData } from './check-data';

const DASHBOARD_PAGES = [
  { path: '/dashboard/koala', name: '后台首页' },
  { path: '/dashboard/koala/professors', name: '教授管理' },
  { path: '/dashboard/koala/publishing', name: '发布管理' },
  { path: '/dashboard/koala/pipeline', name: '采集管线' },
  { path: '/dashboard/koala/leads', name: '线索管理' },
  { path: '/dashboard/koala/feedback', name: '反馈分析' },
  { path: '/dashboard/koala/knowledge-base', name: '知识库管理' },
  { path: '/dashboard/koala/revenue', name: '收入统计' },
];

async function checkDashboardPages() {
  const results = [];
  for (const p of DASHBOARD_PAGES) {
    try {
      const resp = await fetch(`http://localhost:3000${p.path}`, { signal: AbortSignal.timeout(10000) });
      results.push({ ...p, status: resp.status, passed: resp.status === 200 });
    } catch (e) {
      results.push({ ...p, status: 'ERR', passed: false, error: (e as Error).message });
    }
  }
  return results;
}

export async function runAllChecks() {
  const date = new Date().toISOString().slice(0, 10);
  const W = 62;
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
  const line = (content: string) => `║  ${pad(content, W - 4)}║`;

  console.log('\n');
  console.log(`╔${'═'.repeat(W - 2)}╗`);
  console.log(line(`Koala 功能验收报告 · ${date}`));
  console.log(`╠${'═'.repeat(W - 2)}╣`);

  // Pages
  const pageResults = await checkPages();
  console.log(line(''));
  console.log(line('📱 C端前台页面'));
  for (const r of pageResults) {
    const icon = r.passed ? '✅' : '❌';
    const failed = r.checks.filter(c => c.startsWith('❌')).join('; ');
    console.log(line(`├── ${r.path.padEnd(28)} ${icon} ${failed || ''}`));
  }

  // APIs
  const apiResults = await checkApis();
  console.log(line(''));
  console.log(line('🔌 API 接口'));
  for (const r of apiResults) {
    const icon = r.passed ? '✅' : '❌';
    const info = r.passed ? `HTTP ${r.status}` : `HTTP ${r.status}${r.error ? ' — ' + r.error : ''}`;
    console.log(line(`├── ${r.name.padEnd(22)} ${icon} ${info}`));
  }

  // Dashboard
  const dashResults = await checkDashboardPages();
  console.log(line(''));
  console.log(line('🏢 后台页面'));
  for (const r of dashResults) {
    const icon = r.passed ? '✅' : '❌';
    console.log(line(`├── ${r.path.padEnd(38)} ${icon}`));
  }

  // Data
  const dataResults = await checkData();
  console.log(line(''));
  console.log(line('💾 数据完整性'));
  for (const r of dataResults.filter(r => ['教授数据', '知识库数据', 'pgvector match_knowledge 函数'].includes(r.name))) {
    const icon = r.passed ? '✅' : '⚠';
    console.log(line(`├── ${r.name.padEnd(30)} ${icon} ${r.value}`));
  }

  // Summary
  const allResults = [
    ...pageResults,
    ...apiResults,
    ...dashResults,
  ];
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  console.log(line(''));
  console.log(`╠${'═'.repeat(W - 2)}╣`);
  console.log(line(`汇总: ✅ 通过: ${passed}    ❌ 未通过: ${failed}`));

  const failedPages = [...pageResults, ...apiResults, ...dashResults].filter(r => !r.passed);
  if (failedPages.length > 0) {
    console.log(line(''));
    console.log(line('需要修复:'));
    for (const r of failedPages) {
      const name = 'name' in r ? r.name : r.path;
      console.log(line(`  ❌ ${name}`));
    }
  }

  console.log(`╚${'═'.repeat(W - 2)}╝\n`);

  return failed === 0;
}

// Only auto-run when invoked directly (not when imported by verify.ts)
if (require.main === module) {
  runAllChecks().then(passed => {
    if (!passed) process.exit(1);
  });
}
