export interface ModuleResult {
  name: string;
  label: string;
  score: number;
  passingScore: number;
  passed: boolean;
  details: string[];
  duration: number;
}

export function printReport(results: ModuleResult[]) {
  const date = new Date().toISOString().slice(0, 10);
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / total);
  const overallPassed = passedCount === total && avgScore >= 70;

  const W = 52;
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
  const line = (content: string) => `║  ${pad(content, W - 4)}║`;

  console.log(`╔${'═'.repeat(W - 2)}╗`);
  console.log(line(`Koala Eval Report · ${date}`));
  console.log(`╠${'═'.repeat(W - 2)}╣`);

  for (const r of results) {
    const status = r.passed ? '✅ PASS' : `❌ FAIL(≥${r.passingScore})`;
    const scoreStr = `${r.score}/100`;
    const content = `${pad(r.label, 18)} ${pad(scoreStr, 8)} ${status}`;
    console.log(line(content));
  }

  console.log(`╠${'═'.repeat(W - 2)}╣`);
  const totalLine = `${pad('总分', 18)} ${pad(avgScore + '/100', 8)} ${overallPassed ? '✅ PASS' : '❌ FAIL'}`;
  console.log(line(totalLine));
  console.log(line(`及格线            70/100`));
  console.log(`╚${'═'.repeat(W - 2)}╝`);

  if (!overallPassed) {
    console.log('\n❌ 以下模块需要修复:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`\n  【${r.label}】 ${r.score}/100 (需要 ${r.passingScore}+)`);
      for (const d of r.details.filter(d => d.startsWith('❌'))) {
        console.log(`    ${d}`);
      }
    }
  }

  return overallPassed;
}

export function printModuleDetails(result: ModuleResult) {
  console.log(`\n─── ${result.label} (${result.score}/100, ${result.duration}ms) ───`);
  for (const d of result.details) {
    console.log(`  ${d}`);
  }
}
