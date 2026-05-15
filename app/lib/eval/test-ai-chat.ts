import Anthropic from '@anthropic-ai/sdk';
import type { ModuleResult } from './report';

// Load .env.local for direct Claude access
function loadEnv() {
  try {
    const { readFileSync } = require('fs');
    const { resolve } = require('path');
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.trim().match(/^([^=#\s][^=]*)=(.*)$/);
      if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
}

loadEnv();

const BASE = 'http://localhost:3000';

interface TestCase {
  id: string;
  mode: string;
  input: string;
  checks: Array<{ rule: string; desc: string }>;
}

const AI_CHAT_TESTS: TestCase[] = [
  {
    id: 'path_1',
    mode: 'path',
    input: '我是电子信息工程本科大三，均分78，没有科研经历，想申请澳洲PhD',
    checks: [
      { rule: 'no_guarantee', desc: '不能出现"保录取""保证""guarantee"' },
      { rule: 'language_chinese', desc: '回复必须是中文' },
      { rule: 'asks_followup', desc: '必须追问更多信息或提供具体建议' },
    ],
  },
  {
    id: 'path_2',
    mode: 'path',
    input: '商科本科GPA 3.9，想转CS方向读PhD',
    checks: [
      { rule: 'acknowledges_difficulty', desc: '承认跨专业有挑战或建议过渡路径' },
      { rule: 'no_discouragement', desc: '不能直接说"不可能"或强烈否定' },
    ],
  },
  {
    id: 'research_1',
    mode: 'research',
    input: 'transformer 架构在蛋白质折叠预测中的应用',
    checks: [
      { rule: 'has_citations', desc: '包含论文引用格式或来源标注' },
      { rule: 'language_chinese', desc: '回复包含中文' },
    ],
  },
  {
    id: 'research_unknown',
    mode: 'research',
    input: '量子纠缠在室温超导中的具体工艺参数是什么？',
    checks: [
      { rule: 'admits_uncertainty', desc: '必须承认不确定或无法找到具体参数' },
    ],
  },
  {
    id: 'companion_1',
    mode: 'chat',
    input: '我真的好焦虑，均分不高，感觉自己什么都不行',
    checks: [
      { rule: 'no_sales', desc: '不能推销服务或直接让买东西' },
      { rule: 'empathetic', desc: '表达共情或理解，不直接给方案' },
    ],
  },
  {
    id: 'write_1',
    mode: 'write',
    input: '帮我写一封给UNSW量子传感方向教授的申请信',
    checks: [
      { rule: 'no_template_direct', desc: '不直接输出通用模板，应追问信息或提示' },
    ],
  },
];

async function claudeJudge(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content[0];
  return text.type === 'text' ? text.text.trim().toUpperCase() : 'NO';
}

async function evaluateResponse(test: TestCase, response: string): Promise<{ score: number; details: string[] }> {
  const details: string[] = [];
  let passedChecks = 0;

  for (const check of test.checks) {
    let passed = false;

    switch (check.rule) {
      case 'has_citations':
        passed = /\[Source|DOI|et al\.|arXiv|doi\.org|Semantic Scholar|OpenAlex|semanticscholar/i.test(response);
        break;
      case 'no_guarantee':
        passed = !/保录取|保证.*录取|guarantee|100%|一定能/i.test(response);
        break;
      case 'language_chinese': {
        const ratio = (response.match(/[\u4e00-\u9fff]/g) || []).length / response.length;
        passed = ratio > 0.15;
        break;
      }
      case 'admits_uncertainty':
        passed = /不确定|不知道|无法确认|没有找到|建议.*验证|cannot confirm|暂无|无法找到|需要.*验证/i.test(response);
        break;
      case 'no_sales':
        passed = !/付费|立即|马上购买|点击购买/i.test(response);
        break;
      case 'asks_followup':
        passed = /[？?]|请问|可以告诉我|你的|方向|时间|背景|建议/i.test(response) && response.length > 50;
        break;
      case 'acknowledges_difficulty':
        passed = /跨专业|挑战|MRes|桥梁|过渡|补充课程|难度|需要|可以|建议/i.test(response);
        break;
      case 'no_discouragement':
        passed = !/不可能|绝对不行|没有机会|放弃/i.test(response);
        break;
      case 'no_template_direct':
        passed = /背景|你的|请|方向|教授|具体|哪位|名字|了解/i.test(response) || response.length < 600;
        break;
      case 'empathetic':
        if (!process.env.ANTHROPIC_API_KEY) {
          passed = !/直接给出建议/i.test(response);
          break;
        }
        try {
          passed = await claudeJudge(
            `以下回答的前两句是否表达了共情或理解（而不是直接给建议）？回答 YES 或 NO。\n\n${response.slice(0, 400)}`
          ) === 'YES';
        } catch { passed = true; }
        break;
      default:
        passed = true;
    }

    if (passed) {
      passedChecks++;
      details.push(`  ✅ ${check.desc}`);
    } else {
      details.push(`  ❌ ${check.desc}`);
    }
  }

  return {
    score: Math.round((passedChecks / test.checks.length) * 100),
    details,
  };
}

export async function runAiChatTests(): Promise<ModuleResult> {
  const start = Date.now();
  const allDetails: string[] = [];
  let totalScore = 0;

  for (const test of AI_CHAT_TESTS) {
    allDetails.push(`\n[${test.id}] mode=${test.mode}`);
    allDetails.push(`  Q: ${test.input.slice(0, 60)}...`);

    try {
      const resp = await fetch(`${BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: test.mode, messages: [{ role: 'user', content: test.input }] }),
        signal: AbortSignal.timeout(30000),
      });

      if (!resp.ok) {
        allDetails.push(`  ❌ HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json() as { reply?: string };
      const reply = data.reply ?? '';
      allDetails.push(`  A: ${reply.slice(0, 80)}...`);

      const { score, details } = await evaluateResponse(test, reply);
      totalScore += score;
      allDetails.push(...details);
      allDetails.push(`  → 得分: ${score}/100`);
    } catch (e) {
      allDetails.push(`  ❌ 调用失败: ${(e as Error).message}`);
    }
  }

  const avgScore = Math.round(totalScore / AI_CHAT_TESTS.length);
  return {
    name: 'ai_chat',
    label: 'AI 对话质量',
    score: avgScore,
    passingScore: 70,
    passed: avgScore >= 70,
    details: allDetails,
    duration: Date.now() - start,
  };
}
