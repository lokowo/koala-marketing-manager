# Koala 功能完整性验收清单
# docs/feature-checklist-spec.md
# Claude Code 自动检查所有功能是否做完、页面能否正常显示

---

## 给 Claude Code 的指令

```
按照 docs/feature-checklist-spec.md 执行完整的功能验收。具体做法：

1. 运行 npm run build，确保零编译错误
2. 运行 npm run dev，启动本地服务
3. 按照清单逐一检查每个页面、每个API、每个功能
4. 输出一份验收报告，标注 ✅已完成 / ⚠部分完成 / ❌未完成
5. 对于未完成的，直接实现，不用等我确认
6. 实现完毕后再次运行验收，直到所有项目都是 ✅

不要跳过任何检查项。
```

---

## 一、编译与构建检查

```bash
# 必须全部通过，任何报错都要修复
npm run build          # 零错误零警告
npm run lint           # 零 lint 错误
npx tsc --noEmit       # 零 TypeScript 类型错误
```

---

## 二、C端前台页面检查（每个页面必须能打开且内容正确）

### 检查方法：启动 npm run dev，用代码访问每个路由

```typescript
// 自动检查脚本：scripts/check-pages.ts

const PAGES_TO_CHECK = [
  {
    path: '/koala/home',
    name: '首页',
    mustContain: [
      '考拉学长',                    // 品牌名
      '开始对话',                    // AI 入口按钮
      '教授',                       // 教授推荐区域
    ],
    mustNotContain: [
      'Stanford', 'MIT', 'Harvard',  // 不能出现美国大学
      '保录取', '保证录取',           // 红线词
      'Error', 'undefined', 'null',  // 代码错误
    ],
    elements: [
      { selector: 'nav', desc: '底部Tab导航存在' },
      { selector: '[data-testid="hero-cta"]', desc: 'Hero区AI入口按钮存在' },
      { selector: '[data-testid="professor-carousel"]', desc: '教授精选横滑存在' },
    ],
  },
  {
    path: '/koala/chat',
    name: 'AI对话页',
    mustContain: ['路径评估', '科研深潜', '陪伴', '文案'],
    mustNotContain: ['Error', 'undefined'],
    elements: [
      { selector: '[data-testid="mode-tabs"]', desc: '四模式Tab存在' },
      { selector: '[data-testid="chat-input"]', desc: '输入框存在' },
      { selector: '[data-testid="send-button"]', desc: '发送按钮存在' },
      { selector: 'nav', desc: '底部Tab导航存在' },
    ],
  },
  {
    path: '/koala/professors',
    name: '教授列表页',
    mustContain: ['教授', '搜索'],
    mustNotContain: ['Stanford', 'MIT', 'Harvard', '4.9', '5 stars'],
    elements: [
      { selector: '[data-testid="search-input"]', desc: '搜索框存在' },
      { selector: '[data-testid="filter-chips"]', desc: '筛选chips存在' },
      { selector: 'nav', desc: '底部Tab导航存在' },
    ],
  },
  {
    path: '/koala/blog',
    name: '博客工具页',
    mustContain: ['博客'],
    mustNotContain: ['Error'],
    elements: [
      { selector: 'nav', desc: '底部Tab导航存在' },
    ],
  },
  {
    path: '/koala/tools/niv',
    name: 'NIV签证评估',
    mustContain: ['NIV', '签证', 'MARA'],
    mustNotContain: ['Error'],
    elements: [],
  },
  {
    path: '/koala/pricing',
    name: '定价页',
    mustContain: ['$1', '$19.9', '$49', '$99', '免费'],
    mustNotContain: ['Error'],
    elements: [],
  },
  {
    path: '/koala/my-progress',
    name: '用户Dashboard',
    mustContain: ['进度', 'Research Readiness'],
    mustNotContain: ['Error'],
    elements: [],
  },
];

// 检查每个页面
async function checkPages() {
  const results = [];
  
  for (const page of PAGES_TO_CHECK) {
    try {
      const resp = await fetch(`http://localhost:3000${page.path}`);
      const html = await resp.text();
      
      const result = {
        path: page.path,
        name: page.name,
        status: resp.status,
        checks: [],
      };
      
      // HTTP 状态码
      if (resp.status === 200) {
        result.checks.push('✅ HTTP 200');
      } else {
        result.checks.push(`❌ HTTP ${resp.status}`);
      }
      
      // 必须包含的内容
      for (const text of page.mustContain) {
        if (html.includes(text)) {
          result.checks.push(`✅ 包含 "${text}"`);
        } else {
          result.checks.push(`❌ 缺少 "${text}"`);
        }
      }
      
      // 不能包含的内容
      for (const text of page.mustNotContain) {
        if (!html.includes(text)) {
          result.checks.push(`✅ 不含 "${text}"`);
        } else {
          result.checks.push(`❌ 错误出现 "${text}"`);
        }
      }
      
      results.push(result);
    } catch (e) {
      results.push({
        path: page.path,
        name: page.name,
        status: 'CRASH',
        checks: [`❌ 页面崩溃: ${e.message}`],
      });
    }
  }
  
  return results;
}
```

---

## 三、API 接口检查（每个接口必须返回正确状态码和数据格式）

```typescript
const API_ENDPOINTS = [
  // ---- AI 对话 ----
  {
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'path', messages: [{ role: 'user', content: '你好' }] },
    expectedStatus: 200,
    responseChecks: [
      { field: 'reply', type: 'string', notEmpty: true },
    ],
    name: 'AI对话 - 路径评估',
  },
  {
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'research', messages: [{ role: 'user', content: 'zinc battery corrosion' }] },
    expectedStatus: 200,
    responseChecks: [
      { field: 'reply', type: 'string', notEmpty: true },
      { field: 'citations', type: 'array' },
    ],
    name: 'AI对话 - 科研深潜',
  },
  {
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'chat', messages: [{ role: 'user', content: '我好焦虑' }] },
    expectedStatus: 200,
    responseChecks: [
      { field: 'reply', type: 'string', notEmpty: true },
    ],
    name: 'AI对话 - 陪伴',
  },
  {
    method: 'POST',
    path: '/api/ai/chat',
    body: { mode: 'write', messages: [{ role: 'user', content: '帮我写RP' }] },
    expectedStatus: 200,
    responseChecks: [
      { field: 'reply', type: 'string', notEmpty: true },
    ],
    name: 'AI对话 - 文案',
  },
  
  // ---- 教授 ----
  {
    method: 'GET',
    path: '/api/professors',
    expectedStatus: 200,
    responseChecks: [
      { field: 'professors', type: 'array' },
      { field: 'total', type: 'number' },
    ],
    name: '教授列表',
  },
  {
    method: 'GET',
    path: '/api/professors?q=quantum&institution=UNSW',
    expectedStatus: 200,
    responseChecks: [
      { field: 'professors', type: 'array' },
    ],
    name: '教授搜索筛选',
  },
  
  // ---- 套磁信 ----
  {
    method: 'GET',
    path: '/api/outreach/credits',
    expectedStatus: [200, 401],
    responseChecks: [],
    name: '积分查询',
  },
  
  // ---- 反馈 ----
  {
    method: 'POST',
    path: '/api/ai/feedback',
    body: { conversationId: 'test', messageIndex: 0, rating: 'helpful', mode: 'path' },
    expectedStatus: [200, 201],
    responseChecks: [],
    name: '反馈提交',
  },
  
  // ---- NIV ----
  {
    method: 'POST',
    path: '/api/niv/assess',
    body: { answers: { 0: 25, 1: 22, 2: 20, 3: 18 } },
    expectedStatus: 200,
    responseChecks: [
      { field: 'totalScore', type: 'number' },
    ],
    name: 'NIV评估',
  },
  
  // ---- 用户面板 ----
  {
    method: 'GET',
    path: '/api/user/dashboard',
    expectedStatus: [200, 401],
    responseChecks: [],
    name: '用户Dashboard数据',
  },
  
  // ---- 对话导出 ----
  {
    method: 'POST',
    path: '/api/ai/export',
    body: { conversationId: 'test', format: 'markdown' },
    expectedStatus: [200, 404],
    responseChecks: [],
    name: '对话导出',
  },
  
  // ---- 博客 ----
  {
    method: 'GET',
    path: '/api/blog',
    expectedStatus: [200],
    responseChecks: [],
    name: '博客列表',
  },
  
  // ---- 社媒 ----
  {
    method: 'POST',
    path: '/api/social/sensitive-check',
    body: { text: '加微信了解详情', platform: 'xiaohongshu' },
    expectedStatus: 200,
    responseChecks: [
      { field: 'processed', type: 'string' },
      { field: 'hasSensitiveWords', type: 'boolean' },
    ],
    name: '敏感词检查',
  },
];
```

---

## 四、导航流转检查（页面之间的跳转是否正确）

```typescript
const NAVIGATION_FLOWS = [
  {
    name: '首页→AI对话',
    steps: [
      { action: 'visit', path: '/koala/home' },
      { action: 'click', target: '"和考拉学长开始对话"按钮' },
      { action: 'expect', path: '/koala/chat' },
    ],
  },
  {
    name: '首页→教授列表→教授详情',
    steps: [
      { action: 'visit', path: '/koala/home' },
      { action: 'click', target: '"查看全部"教授链接' },
      { action: 'expect', path: '/koala/professors' },
      { action: 'click', target: '第一个教授卡片' },
      { action: 'expect', pathPattern: '/koala/professors/[slug]' },
    ],
  },
  {
    name: '教授详情→问Koala',
    steps: [
      { action: 'visit', pathPattern: '/koala/professors/[any-slug]' },
      { action: 'click', target: '"问Koala"按钮' },
      { action: 'expect', path: '/koala/chat' },
      { action: 'expect_content', contains: '教授' },
    ],
  },
  {
    name: '底部Tab导航五个页面互相切换',
    steps: [
      { action: 'visit', path: '/koala/home' },
      { action: 'click', target: 'Tab:教授' },
      { action: 'expect', path: '/koala/professors' },
      { action: 'click', target: 'Tab:Koala' },
      { action: 'expect', path: '/koala/chat' },
      { action: 'click', target: 'Tab:博客' },
      { action: 'expect', path: '/koala/blog' },
      { action: 'click', target: 'Tab:工具' },
      { action: 'expect', pathPattern: '/koala/tools' },
      { action: 'click', target: 'Tab:首页' },
      { action: 'expect', path: '/koala/home' },
    ],
  },
  {
    name: 'AI对话四模式切换',
    steps: [
      { action: 'visit', path: '/koala/chat' },
      { action: 'click', target: '路径评估Tab' },
      { action: 'expect_content', contains: '路径' },
      { action: 'click', target: '科研深潜Tab' },
      { action: 'expect_content', contains: '科研' },
      { action: 'click', target: '陪伴Tab' },
      { action: 'expect_content', contains: '陪伴' },
      { action: 'click', target: '文案Tab' },
      { action: 'expect_content', contains: '文案' },
    ],
  },
];
```

---

## 五、后台功能检查

```typescript
const BACKEND_CHECKS = [
  // ---- 已有后台页面 ----
  {
    path: '/dashboard/koala',
    name: '后台首页',
    checks: ['page_loads', 'has_nav'],
  },
  {
    path: '/dashboard/koala/professors',
    name: '教授管理',
    checks: ['page_loads', 'has_list', 'has_search'],
  },
  {
    path: '/dashboard/koala/publishing',
    name: '发布管理',
    checks: ['page_loads'],
  },
  
  // ---- PRD v2 要求但可能未实现的后台页面 ----
  {
    path: '/dashboard/koala/pipeline',
    name: '采集管线监控',
    checks: ['page_loads'],
    required_by_prd: true,
    prd_section: '第九章：/dashboard/koala/pipeline',
    expected_features: [
      '上次采集时间显示',
      '新增/更新教授数量',
      '待审核数量',
      'API状态（ARC/Semantic Scholar）',
      '一键触发采集按钮',
      '手动补充教授入口',
    ],
  },
  {
    path: '/dashboard/koala/leads',
    name: '线索管理',
    checks: ['page_loads'],
    required_by_prd: true,
    expected_features: [
      '线索列表（来源/AI评分/状态/文件）',
      '完整对话记录查看',
      '简历/成绩单下载',
      '状态管理',
    ],
  },
  {
    path: '/dashboard/koala/feedback',
    name: '反馈分析',
    checks: ['page_loads'],
    required_by_prd: true,
    expected_features: [
      '按模式的👍/👎统计',
      '高频问题排行',
      '知识库更新建议',
    ],
  },
  {
    path: '/dashboard/koala/knowledge-base',
    name: '知识库管理',
    checks: ['page_loads'],
    required_by_prd: true,
    expected_features: [
      '查看所有knowledge_chunks',
      '按来源/领域筛选',
      '手动上传论文',
      '测试搜索',
    ],
  },
  {
    path: '/dashboard/koala/revenue',
    name: '收入统计',
    checks: ['page_loads'],
    required_by_prd: true,
    expected_features: [
      '套磁信购买数/收入',
      '订阅用户数',
      '转化率',
    ],
  },
];
```

---

## 六、数据完整性检查

```typescript
const DATA_CHECKS = [
  {
    name: '教授表有数据',
    query: 'SELECT COUNT(*) FROM professors',
    expect: 'count > 0',
    fix: '运行 professor_collector.py 采集教授数据',
  },
  {
    name: '知识库有数据',
    query: 'SELECT COUNT(*) FROM knowledge_chunks',
    expect: 'count > 0',
    fix: '运行 knowledge_builder.js 构建知识库',
  },
  {
    name: '敏感词有数据',
    query: 'SELECT COUNT(*) FROM sensitive_words',
    expect: 'count > 10',
    fix: '运行 sensitive_words_full.sql',
  },
  {
    name: '教授表有必要字段',
    query: "SELECT COUNT(*) FROM professors WHERE h_index IS NOT NULL AND institution IS NOT NULL",
    expect: 'count > 0',
    fix: '教授数据缺少 h_index 或 institution',
  },
  {
    name: 'pgvector函数存在',
    query: "SELECT proname FROM pg_proc WHERE proname = 'match_knowledge'",
    expect: 'row_count > 0',
    fix: '运行 supabase/functions.sql 创建搜索函数',
  },
  {
    name: '新增表存在',
    tables: [
      'professors', 'grants', 'papers', 'leads',
      'ai_conversations', 'feedback', 'blog_posts',
      'knowledge_chunks', 'user_credits', 'outreach_emails',
      'user_achievements', 'daily_tasks', 'professor_matches',
      'followup_reminders', 'sensitive_words',
    ],
    fix: '在 Supabase SQL Editor 运行 schema.sql',
  },
];
```

---

## 七、输出报告格式

```
╔══════════════════════════════════════════════════════════════╗
║  Koala 功能验收报告 · 2026-04-29                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📦 编译构建                                                 ║
║  ├── npm run build        ✅ 零错误                          ║
║  ├── TypeScript 类型检查   ✅ 零错误                          ║
║  └── Lint 检查             ✅ 零警告                          ║
║                                                              ║
║  📱 C端前台页面（共 8 页）                                    ║
║  ├── /koala/home          ✅ 200 · 内容正确                   ║
║  ├── /koala/chat          ✅ 200 · 四模式Tab存在              ║
║  ├── /koala/professors    ✅ 200 · 无美国大学                 ║
║  ├── /koala/professors/x  ⚠ 200 · 缺少分享按钮              ║
║  ├── /koala/blog          ✅ 200                              ║
║  ├── /koala/tools/niv     ✅ 200 · MARA声明存在              ║
║  ├── /koala/pricing       ❌ 404 · 页面未创建                 ║
║  └── /koala/my-progress   ✅ 200                              ║
║                                                              ║
║  🔌 API 接口（共 12 个）                                     ║
║  ├── POST /api/ai/chat (path)       ✅ 200                   ║
║  ├── POST /api/ai/chat (research)   ✅ 200 · 有引用          ║
║  ├── POST /api/ai/chat (chat)       ✅ 200                   ║
║  ├── POST /api/ai/chat (write)      ✅ 200                   ║
║  ├── GET  /api/professors           ✅ 200                   ║
║  ├── GET  /api/outreach/credits     ✅ 200                   ║
║  ├── POST /api/outreach/generate    ⚠ 500 · 需要教授数据    ║
║  ├── POST /api/ai/feedback          ✅ 201                   ║
║  ├── POST /api/niv/assess           ✅ 200                   ║
║  ├── GET  /api/user/dashboard       ✅ 200                   ║
║  ├── POST /api/ai/export            ✅ 200                   ║
║  └── POST /api/social/sensitive     ✅ 200                   ║
║                                                              ║
║  🧭 导航流转（共 5 条）                                      ║
║  ├── 首页→AI对话             ✅                               ║
║  ├── 首页→教授列表→详情      ✅                               ║
║  ├── 教授详情→问Koala        ⚠ 按钮存在但跳转未测            ║
║  ├── 底部Tab五页面切换       ✅                               ║
║  └── AI对话四模式切换        ✅                               ║
║                                                              ║
║  🏢 后台页面（共 8 页）                                      ║
║  ├── /dashboard/koala              ✅                         ║
║  ├── /dashboard/koala/professors   ✅                         ║
║  ├── /dashboard/koala/publishing   ✅                         ║
║  ├── /dashboard/koala/pipeline     ❌ 未创建                  ║
║  ├── /dashboard/koala/leads        ❌ 未创建                  ║
║  ├── /dashboard/koala/feedback     ❌ 未创建                  ║
║  ├── /dashboard/koala/knowledge    ❌ 未创建                  ║
║  └── /dashboard/koala/revenue      ❌ 未创建                  ║
║                                                              ║
║  💾 数据完整性                                                ║
║  ├── 教授表有数据              ⚠ 0条（需运行采集脚本）        ║
║  ├── 知识库有数据              ⚠ 0条（需运行构建脚本）        ║
║  ├── 敏感词有数据              ✅ 14条                        ║
║  ├── pgvector函数存在          ✅                             ║
║  └── 所有表存在                ✅ 15/15                       ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  汇总：                                                      ║
║  ✅ 通过: 28    ⚠ 部分: 5    ❌ 未完成: 6                    ║
║                                                              ║
║  需要修复的：                                                 ║
║  1. ❌ /koala/pricing 页面未创建                              ║
║  2. ❌ 后台 pipeline/leads/feedback/knowledge/revenue 未创建  ║
║  3. ⚠ 教授数据库为空（需运行采集脚本）                       ║
║  4. ⚠ 知识库为空（需运行构建脚本）                           ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 八、执行方式

```json
// package.json
{
  "scripts": {
    "check": "tsx scripts/check-all.ts",
    "check:pages": "tsx scripts/check-pages.ts",
    "check:api": "tsx scripts/check-api.ts",
    "check:data": "tsx scripts/check-data.ts",
    "eval": "tsx app/lib/eval/run-all.ts",
    "verify": "npm run build && npm run check && npm run eval"
  }
}

// npm run verify = 一次性跑完所有检查
```
