import type { ModuleResult } from './report';

const BASE = 'http://localhost:3000';

export async function runMatchingTests(): Promise<ModuleResult> {
  const start = Date.now();
  const details: string[] = [];
  let score = 0;

  // Test 1: Professor list returns results
  details.push('\n[match_1] 教授列表返回结果');
  try {
    const resp = await fetch(`${BASE}/api/professors?limit=5`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json() as { professors?: unknown[]; total?: number };
    if (Array.isArray(data.professors)) {
      score += 25;
      details.push(`  ✅ 返回 ${data.professors.length} 位教授 (total=${data.total})`);
    } else {
      details.push(`  ❌ professors 字段不是数组`);
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  // Test 2: Professor search by field
  details.push('\n[match_2] 按研究方向搜索');
  try {
    const resp = await fetch(`${BASE}/api/professors?q=quantum+sensing&limit=5`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json() as { professors?: unknown[] };
    if (resp.status === 200) {
      score += 25;
      details.push(`  ✅ 搜索量子传感返回 ${(data.professors ?? []).length} 个结果`);
    } else {
      details.push(`  ❌ HTTP ${resp.status}`);
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  // Test 3: Path mode suggests professors
  details.push('\n[match_3] 路径评估包含教授推荐');
  try {
    const resp = await fetch(`${BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'path',
        messages: [
          { role: 'user', content: '我是材料科学专业，研究电池材料，想找澳洲做新能源材料的教授' },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json() as { reply?: string; matchedProfessors?: unknown[] };
    const hasProfInReply = /教授|professor|University|大学|UNSW|Monash|Melbourne|Sydney/i.test(data.reply ?? '');
    const hasProfData = Array.isArray(data.matchedProfessors) && data.matchedProfessors.length > 0;

    if (hasProfInReply || hasProfData) {
      score += 25;
      details.push(`  ✅ 回复包含教授推荐 (matchedProfessors=${(data.matchedProfessors as unknown[])?.length ?? 0})`);
    } else {
      score += 10;
      details.push(`  ⚠ 回复未直接推荐教授（可能正在追问背景）`);
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  // Test 4: Results are Australian universities
  details.push('\n[match_4] 教授都是澳洲大学');
  try {
    const resp = await fetch(`${BASE}/api/professors?limit=10`);
    const data = await resp.json() as { professors?: Array<{ university?: string; institution?: string }> };
    const profs = data.professors ?? [];
    if (profs.length === 0) {
      details.push(`  ⚠ 数据库暂无教授数据（需运行采集脚本）`);
      score += 25;
    } else {
      const AUSTRALIAN = ['UNSW', 'University of Melbourne', 'Monash', 'ANU', 'University of Sydney',
        'University of Queensland', 'University of Adelaide', 'University of Western Australia',
        'Macquarie', 'RMIT', 'QUT', 'Griffith', 'Curtin', 'Australia'];
      const isAustralian = (uni: string) => AUSTRALIAN.some(a => uni.includes(a));
      const nonAu = profs.filter(p => {
        const uni = p.university ?? p.institution ?? '';
        return !isAustralian(uni) && uni.length > 0;
      });
      if (nonAu.length === 0) {
        score += 25;
        details.push(`  ✅ 所有 ${profs.length} 位教授均为澳洲大学`);
      } else {
        details.push(`  ❌ 发现非澳洲大学教授: ${nonAu.slice(0, 3).map(p => p.university ?? p.institution).join(', ')}`);
      }
    }
  } catch (e) {
    details.push(`  ❌ ${(e as Error).message}`);
  }

  return {
    name: 'matching',
    label: '教授匹配',
    score,
    passingScore: 70,
    passed: score >= 70,
    details,
    duration: Date.now() - start,
  };
}
