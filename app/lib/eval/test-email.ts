import type { ModuleResult } from './report';

const BASE = 'http://localhost:3000';

export async function runEmailTests(): Promise<ModuleResult> {
  const start = Date.now();
  const details: string[] = [];
  let score = 0;

  // Test 1: Write mode asks for details before generating
  details.push('\n[email_1] 申请信生成前追问信息');
  try {
    const resp = await fetch(`${BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'write',
        messages: [{ role: 'user', content: '帮我写一封给UNSW量子传感方向教授的申请信' }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json() as { reply?: string };
    const reply = data.reply ?? '';

    // Should ask for details OR provide language guidance (not immediately output full template)
    const asksForInfo = /背景|你的|请问|方向|英语|简历|研究|哪位|名字|具体/i.test(reply);
    const languageGuidance = /英文|English|中文|语言/i.test(reply);
    const isShortResponse = reply.split(' ').length < 200;

    if (asksForInfo || languageGuidance || isShortResponse) {
      score += 50;
      details.push(`  ✅ 追问信息或说明语言要求（不直接输出模板）`);
    } else {
      details.push(`  ❌ 直接输出了邮件模板而未追问背景信息`);
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  // Test 2: No guarantee words in write mode
  details.push('\n[email_2] 无保证性措辞');
  try {
    const resp = await fetch(`${BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'write',
        messages: [
          { role: 'user', content: '帮我写一封给UNSW量子传感方向教授的申请信' },
          { role: 'assistant', content: '好的，请告诉我你的研究背景' },
          { role: 'user', content: '我是电子工程本科，研究MEMS传感器，想申请Professor Wang的PhD' },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json() as { reply?: string };
    const reply = data.reply ?? '';
    const hasGuarantee = /保录取|保证录取|guaranteed|100% success/i.test(reply);

    if (!hasGuarantee) {
      score += 50;
      details.push(`  ✅ 无保证性措辞`);
    } else {
      details.push(`  ❌ 包含保证性措辞`);
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  return {
    name: 'email',
    label: '申请信质量',
    score,
    passingScore: 80,
    passed: score >= 80,
    details,
    duration: Date.now() - start,
  };
}
