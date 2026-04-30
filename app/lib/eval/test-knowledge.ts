import type { ModuleResult } from './report';

const BASE = 'http://localhost:3000';

export async function runKnowledgeTests(): Promise<ModuleResult> {
  const start = Date.now();
  const details: string[] = [];
  let score = 0;

  // Test 1: Research mode returns citations
  details.push('\n[kb_1] 科研深潜返回引用');
  try {
    const resp = await fetch(`${BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'research', messages: [{ role: 'user', content: 'zinc anode corrosion seawater battery latest research' }] }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await resp.json() as { reply?: string; citations?: unknown[] };
    const hasCitations = Array.isArray(data.citations) && data.citations.length > 0;
    const hasSourceInReply = /source|doi|semantic|arXiv|openAlex/i.test(data.reply ?? '');

    if (hasCitations || hasSourceInReply) {
      score += 35;
      details.push(`  ✅ 返回 ${Array.isArray(data.citations) ? data.citations.length : 0} 个引用`);
    } else {
      details.push(`  ❌ 未返回引用 (citations=${JSON.stringify(data.citations)?.slice(0, 50)})`);
    }
  } catch (e) {
    details.push(`  ❌ 调用失败: ${(e as Error).message}`);
  }

  // Test 2: Research mode on PhD topics
  details.push('\n[kb_2] TFS奖学金信息');
  try {
    const resp = await fetch(`${BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'research', messages: [{ role: 'user', content: 'TFS奖学金申请要求' }] }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await resp.json() as { reply?: string };
    const hasInfo = /TFS|奖学金|scholarship|澳洲/i.test(data.reply ?? '');
    if (hasInfo) {
      score += 35;
      details.push(`  ✅ 包含TFS/奖学金相关信息`);
    } else {
      details.push(`  ❌ 回复缺少TFS信息`);
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  // Test 3: Irrelevant query should not return confident academic claims
  details.push('\n[kb_3] 不相关查询不应返回错误引用');
  try {
    const resp = await fetch(`${BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'research', messages: [{ role: 'user', content: 'cooking pasta recipes Italian kitchen' }] }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json() as { reply?: string; citations?: unknown[] };
    // Should either return empty citations or admit it's outside scope
    const noCitations = !Array.isArray(data.citations) || data.citations.length === 0;
    const admiitsScope = /学术|研究|范围|不太|料理|烹饪/i.test(data.reply ?? '');
    if (noCitations || admiitsScope) {
      score += 30;
      details.push(`  ✅ 不相关查询处理合理`);
    } else {
      details.push(`  ⚠ 返回了不相关引用 (${(data.citations as unknown[])?.length} 个)`);
      score += 15;
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  return {
    name: 'knowledge',
    label: '知识库检索',
    score,
    passingScore: 60,
    passed: score >= 60,
    details,
    duration: Date.now() - start,
  };
}
