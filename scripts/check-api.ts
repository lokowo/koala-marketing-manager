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

interface ApiEndpoint {
  name: string;
  method: string;
  path: string;
  body?: unknown;
  expectedStatus: number | number[];
  responseChecks: Array<{ field: string; type: string }>;
  timeout?: number;
}

const ENDPOINTS: ApiEndpoint[] = [
  { name: 'AI对话 - 路径评估', method: 'POST', path: '/api/ai/chat',
    body: { mode: 'path', messages: [{ role: 'user', content: '你好' }] },
    expectedStatus: 200, responseChecks: [{ field: 'reply', type: 'string' }] },
  { name: 'AI对话 - 科研深潜', method: 'POST', path: '/api/ai/chat',
    body: { mode: 'research', messages: [{ role: 'user', content: 'quantum sensing' }] },
    expectedStatus: 200, responseChecks: [{ field: 'reply', type: 'string' }], timeout: 60000 },
  { name: 'AI对话 - 陪伴', method: 'POST', path: '/api/ai/chat',
    body: { mode: 'chat', messages: [{ role: 'user', content: '我好焦虑' }] },
    expectedStatus: 200, responseChecks: [{ field: 'reply', type: 'string' }] },
  { name: 'AI对话 - 文案', method: 'POST', path: '/api/ai/chat',
    body: { mode: 'write', messages: [{ role: 'user', content: '帮我写RP' }] },
    expectedStatus: 200, responseChecks: [{ field: 'reply', type: 'string' }] },
  { name: '教授列表', method: 'GET', path: '/api/professors',
    expectedStatus: 200, responseChecks: [{ field: 'professors', type: 'array' }, { field: 'total', type: 'number' }] },
  { name: '教授搜索', method: 'GET', path: '/api/professors?q=quantum',
    expectedStatus: 200, responseChecks: [{ field: 'professors', type: 'array' }] },
  { name: '积分查询', method: 'GET', path: '/api/outreach/credits',
    expectedStatus: [200, 401], responseChecks: [] },
  { name: '反馈提交', method: 'POST', path: '/api/ai/feedback',
    body: { conversationId: 'check-test', messageIndex: 0, rating: 'helpful', mode: 'path' },
    expectedStatus: [200, 201], responseChecks: [] },
  { name: 'NIV评估', method: 'POST', path: '/api/niv/assess',
    body: { answers: { visa_type: 'student_500', education: 'bachelor', english: 'good', financial: 'full' } },
    expectedStatus: 200, responseChecks: [{ field: 'totalScore', type: 'number' }] },
  { name: '用户Dashboard', method: 'GET', path: '/api/user/dashboard',
    expectedStatus: [200, 401], responseChecks: [] },
  { name: '对话导出', method: 'POST', path: '/api/ai/export',
    body: { messages: [{ role: 'user', content: 'test' }], mode: 'path' },
    expectedStatus: [200, 404], responseChecks: [] },
  { name: '博客列表', method: 'GET', path: '/api/blog',
    expectedStatus: 200, responseChecks: [] },
  { name: '敏感词检查', method: 'POST', path: '/api/social/sensitive-check',
    body: { text: '加微信了解详情', platform: 'xiaohongshu' },
    expectedStatus: 200, responseChecks: [{ field: 'processed', type: 'string' }, { field: 'hasSensitiveWords', type: 'boolean' }] },
];

export interface ApiResult {
  name: string;
  path: string;
  status: number | string;
  passed: boolean;
  error?: string;
}

export async function checkApis(): Promise<ApiResult[]> {
  const results: ApiResult[] = [];

  for (const ep of ENDPOINTS) {
    try {
      const opts: RequestInit = {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(ep.timeout ?? 30000),
      };
      if (ep.body) opts.body = JSON.stringify(ep.body);

      const resp = await fetch(`${BASE}${ep.path}`, opts);
      const statusOk = Array.isArray(ep.expectedStatus)
        ? ep.expectedStatus.includes(resp.status)
        : resp.status === ep.expectedStatus;

      if (!statusOk) {
        results.push({ name: ep.name, path: ep.path, status: resp.status, passed: false, error: `期望 ${JSON.stringify(ep.expectedStatus)}` });
        continue;
      }

      if (ep.responseChecks.length === 0) {
        results.push({ name: ep.name, path: ep.path, status: resp.status, passed: true });
        continue;
      }

      let json: Record<string, unknown> = {};
      try { json = await resp.json(); } catch {
        results.push({ name: ep.name, path: ep.path, status: resp.status, passed: false, error: '响应不是有效JSON' });
        continue;
      }

      let failed = false;
      for (const check of ep.responseChecks) {
        const val = json[check.field];
        const ok = check.type === 'array' ? Array.isArray(val) : typeof val === check.type;
        if (!ok) { failed = true; break; }
      }

      results.push({ name: ep.name, path: ep.path, status: resp.status, passed: !failed, error: failed ? '字段类型不符' : undefined });
    } catch (e) {
      results.push({ name: ep.name, path: ep.path, status: 'ERR', passed: false, error: (e as Error).message });
    }
  }

  return results;
}

if (require.main === module) {
  checkApis().then(results => {
    console.log('\n🔌 API 接口检查');
    for (const r of results) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.name} (${r.path}) — ${r.status}${r.error ? ' — ' + r.error : ''}`);
    }
    const passed = results.filter(r => r.passed).length;
    console.log(`\n${passed}/${results.length} 接口通过`);
  });
}
