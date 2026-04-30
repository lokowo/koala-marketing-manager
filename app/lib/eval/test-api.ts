import type { ModuleResult } from './report';

const BASE = 'http://localhost:3000';

interface ApiTest {
  name: string;
  method: string;
  path: string;
  body?: unknown;
  expectedStatus: number | number[];
  responseChecks: Array<{ field: string; type: string; notEmpty?: boolean }>;
}

const API_TESTS: ApiTest[] = [
  {
    name: 'AI对话 - 路径评估',
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'path', messages: [{ role: 'user', content: '你好' }] },
    expectedStatus: 200,
    responseChecks: [{ field: 'reply', type: 'string', notEmpty: true }],
  },
  {
    name: 'AI对话 - 科研深潜',
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'research', messages: [{ role: 'user', content: 'quantum sensing papers' }] },
    expectedStatus: 200,
    responseChecks: [
      { field: 'reply', type: 'string', notEmpty: true },
      { field: 'citations', type: 'array' },
    ],
  },
  {
    name: 'AI对话 - 陪伴',
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'chat', messages: [{ role: 'user', content: '我好焦虑' }] },
    expectedStatus: 200,
    responseChecks: [{ field: 'reply', type: 'string', notEmpty: true }],
  },
  {
    name: 'AI对话 - 文案',
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'write', messages: [{ role: 'user', content: '帮我写RP' }] },
    expectedStatus: 200,
    responseChecks: [{ field: 'reply', type: 'string', notEmpty: true }],
  },
  {
    name: '教授列表',
    method: 'GET',
    path: '/api/professors',
    expectedStatus: 200,
    responseChecks: [
      { field: 'professors', type: 'array' },
      { field: 'total', type: 'number' },
    ],
  },
  {
    name: '教授搜索筛选',
    method: 'GET',
    path: '/api/professors?q=quantum&institution=UNSW',
    expectedStatus: 200,
    responseChecks: [{ field: 'professors', type: 'array' }],
  },
  {
    name: '积分查询',
    method: 'GET',
    path: '/api/outreach/credits',
    expectedStatus: [200, 401],
    responseChecks: [],
  },
  {
    name: '反馈提交',
    method: 'POST',
    path: '/api/ai/feedback',
    body: { conversationId: 'eval-test', messageIndex: 0, rating: 'helpful', mode: 'path' },
    expectedStatus: [200, 201],
    responseChecks: [],
  },
  {
    name: 'NIV评估',
    method: 'POST',
    path: '/api/niv/assess',
    body: { answers: { visa_type: 'student_500', education: 'bachelor', english: 'good', financial: 'full' } },
    expectedStatus: 200,
    responseChecks: [{ field: 'totalScore', type: 'number' }],
  },
  {
    name: '用户Dashboard数据',
    method: 'GET',
    path: '/api/user/dashboard',
    expectedStatus: [200, 401],
    responseChecks: [],
  },
  {
    name: '对话导出',
    method: 'POST',
    path: '/api/ai/export',
    body: { conversationId: 'eval-test', format: 'markdown' },
    expectedStatus: [200, 404],
    responseChecks: [],
  },
  {
    name: '博客列表',
    method: 'GET',
    path: '/api/blog',
    expectedStatus: 200,
    responseChecks: [],
  },
  {
    name: '敏感词检查',
    method: 'POST',
    path: '/api/social/sensitive-check',
    body: { text: '加微信了解详情', platform: 'xiaohongshu' },
    expectedStatus: 200,
    responseChecks: [
      { field: 'processed', type: 'string' },
      { field: 'hasSensitiveWords', type: 'boolean' },
    ],
  },
];

export async function runApiTests(): Promise<ModuleResult> {
  const start = Date.now();
  const details: string[] = [];
  let passed = 0;

  for (const test of API_TESTS) {
    try {
      const opts: RequestInit = {
        method: test.method,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
      };
      if (test.body) opts.body = JSON.stringify(test.body);

      const resp = await fetch(`${BASE}${test.path}`, opts);
      const statusOk = Array.isArray(test.expectedStatus)
        ? test.expectedStatus.includes(resp.status)
        : resp.status === test.expectedStatus;

      if (!statusOk) {
        details.push(`❌ ${test.name}: HTTP ${resp.status} (期望 ${JSON.stringify(test.expectedStatus)})`);
        continue;
      }

      if (test.responseChecks.length === 0) {
        passed++;
        details.push(`✅ ${test.name}: HTTP ${resp.status}`);
        continue;
      }

      let json: Record<string, unknown>;
      try {
        json = await resp.json();
      } catch {
        details.push(`❌ ${test.name}: 响应不是有效 JSON`);
        continue;
      }

      let checksFailed = false;
      for (const check of test.responseChecks) {
        const val = json[check.field];
        const typeOk = check.type === 'array' ? Array.isArray(val) : typeof val === check.type;
        const notEmptyOk = !check.notEmpty || (typeof val === 'string' && val.length > 0);
        if (!typeOk || !notEmptyOk) {
          details.push(`❌ ${test.name}: 字段 ${check.field} 类型或值不符`);
          checksFailed = true;
          break;
        }
      }

      if (!checksFailed) {
        passed++;
        details.push(`✅ ${test.name}: HTTP ${resp.status}`);
      }
    } catch (e) {
      details.push(`❌ ${test.name}: ${(e as Error).message}`);
    }
  }

  const score = Math.round((passed / API_TESTS.length) * 100);
  return {
    name: 'api',
    label: 'API 功能',
    score,
    passingScore: 100,
    passed: score >= 100,
    details,
    duration: Date.now() - start,
  };
}
