# ========================================
# KOALA 开发工作流强制规则（置于 CLAUDE.md 最顶部）
# ========================================

## 🚨 指令执行合约（每条指令必须遵守）

每条 Claude Code 指令都是一份合约。执行前先检查这 6 条：

1. **锚定可验证事实** — 确认指令里的前置状态（commit hash、Vercel 状态、当前报错）。如果前置不成立，先报告再执行。
2. **线性主步骤 + 局部分支** — 按 1→2→3→4→5 顺序执行。只在现实有多种情况时走分支，其他直给。
3. **每步验证闸** — 每个步骤有明确的"完成"定义（build 通过、curl 返回 200、echo 输出 ✅）。验证不过不能进入下一步。
4. **约束是「不许」清单** — 严格遵守指令中的禁止项。没有提到的文件不许改，没有要求的功能不许加。
5. **强制汇报** — 完成后必须报告：采用了哪种修法、改了哪些文件（含路径）、验证结果。
6. **自包含** — 不依赖"之前对话"。所有需要的信息都在指令和项目文件中。

## 🚨 UI 开发强制规则

1. 任何涉及 UI/样式/组件的任务，**开工前必须先读 docs/DESIGN.md**。
2. 在 plan 中必须引用 DESIGN.md 中**至少 3 条具体规则**（颜色变量、字号、间距、组件选型）。
3. 所有表单字段值必须使用 `text-primary` 颜色，**禁止使用 placeholder 色**。
4. 所有数据看板每个指标必须有 ℹ️ tooltip 解释口径（从 `lib/metrics-glossary.ts` 取文案）。
5. 所有显示 sales agent 的地方**必须用 display_name**，不用 user_id 或原始 name。
6. 所有显示 code/ID 的地方**必须同时显示人类可读标签**。

## 🚨 数据完整性规则

1. professors 表：只允许 country IN ('Australia', 'AU', 'AUS') 的记录为 is_active=true。
2. universities 表：是唯一的大学白名单，任何新增教授/奖学金必须引用 universities.id。
3. 所有 admin API 查 users 数据时，使用 service_role key 或确保 RLS 策略对 admin 角色开放。
4. 分母为 0 的计算（如 ARPU、留存率、推荐占比）显示 "—" 或 "N/A"，**禁止显示 0 或 0%**。

## 🚨 DB 变更传播检查清单

任何数据库列/表的变更，必须同时完成以下检查：
- [ ] API route 已引用新列/表
- [ ] 前端组件已展示或使用新数据
- [ ] RLS 策略已更新
- [ ] 种子数据 / migration 已就绪
- [ ] 相关的 metrics-glossary 已更新（如涉及新指标）

## 4 道质量关卡（Gate）

### Gate 1: 规格文档先行
每个功能开工前，`docs/specs/` 下必须有规格文件（业务规则 IF/THEN + 数据库改动 + API 契约 + 前端行为）。

### Gate 2: 原子化指令
每条 Claude Code 指令只做 1 个功能，完成后验证，再给下一条。禁止 "一次性做 24 个文件"。

### Gate 3: 冒烟测试
部署前跑 `scripts/smoke-test.ts`（或手动点每个页面），确保：页面加载正常、数据非空、指标不矛盾。

### Gate 4: 设计审查
UI 变更完成后，运行 design-reviewer agent 对照 DESIGN.md 审查。不通过则回炉。
@AGENTS.md
现在 Next.js 项目已经创建成功，并且 localhost:3000 可以打开默认页面。

请先替换 app/page.tsx，做一个 Business Selector 首页。

要求：
1. 深色高级 SaaS 后台风格
2. 三张业务卡：Koala PhD、Lucent、Teddy Legal
3. Koala 卡片可以点击进入 /dashboard/koala
4. Lucent 和 Teddy 暂时 disabled
5. 使用 Tailwind CSS
6. 不要安装额外依赖



# ============ 以下为 2026-04-28 更新的 C端产品规则 ============
# CLAUDE.md — Koala PhD Project Context
# Claude Code 必须在每次开发前阅读此文件

---

## 项目概述

Koala PhD 是一个 AI PhD Advisor 平台。C端前台以 AI 对话为核心，后台自动采集澳洲教授数据。
商业模式：免费教授匹配 → $1/封定制套磁信 → 订阅。

**完整 PRD 在 `docs/koala_prd_v2.md`，所有产品逻辑以该文件为准。**

---

## 技术栈（严格遵守，不要替换）

```
Framework:    Next.js 14 App Router + TypeScript
Styling:      Tailwind CSS
Database:     Supabase PostgreSQL + pgvector
Auth:         Supabase Auth
Storage:      Supabase Storage
AI:           Anthropic Claude API (claude-sonnet-4-6)
Embedding:    OpenAI text-embedding-3-small (1536 dims)
Papers:       Semantic Scholar API (free)
PDF:          @react-pdf/renderer
Email:        Resend API
Deploy:       Vercel
```

---

## 环境变量（.env.local）

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SEMANTIC_SCHOLAR_API_KEY=
RESEND_API_KEY=
```

**绝对不要在任何前端代码中引用 SUPABASE_SERVICE_ROLE_KEY 或 ANTHROPIC_API_KEY。** 这些只在 `app/api/` 路由和 `lib/server/` 中使用。

---

## 文件结构（严格遵守）

```
koala-phd/
├── CLAUDE.md                          ← 你正在读的文件
├── docs/
│   ├── koala_prd_v2.md               ← 产品需求文档（必读）
│   └── koala_ai_prompts.md           ← AI Prompt 库（必读）
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                ← Root layout（字体、Providers）
│   │   ├── page.tsx                  ← 首页
│   │   ├── ai/page.tsx              ← AI 全屏对话页（核心）
│   │   ├── professors/
│   │   │   ├── page.tsx             ← 教授列表
│   │   │   └── [slug]/page.tsx      ← 教授详情
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── tools/
│   │   │   ├── page.tsx             ← 工具列表
│   │   │   ├── niv/page.tsx
│   │   │   └── pricing/page.tsx
│   │   │
│   │   └── api/                      ← 所有后端逻辑
│   │       ├── ai/
│   │       │   ├── chat/route.ts    ← POST: AI 对话（所有4模式）
│   │       │   ├── feedback/route.ts ← POST: 反馈提交
│   │       │   └── export/route.ts  ← POST: 对话导出 PDF
│   │       ├── professors/
│   │       │   ├── route.ts         ← GET: 搜索/筛选/分页
│   │       │   ├── [slug]/route.ts  ← GET: 详情
│   │       │   └── sync/route.ts    ← POST: 触发自动采集（Admin only）
│   │       ├── outreach/
│   │       │   ├── generate/route.ts ← POST: 生成套磁信
│   │       │   ├── send/route.ts    ← POST: 发送套磁信
│   │       │   └── credits/route.ts ← GET/POST: 积分查询/购买
│   │       ├── report/
│   │       │   ├── generate/route.ts
│   │       │   └── [id]/route.ts
│   │       ├── blog/route.ts
│   │       ├── niv/assess/route.ts
│   │       └── cron/
│   │           ├── sync-professors/route.ts  ← Vercel Cron
│   │           ├── update-knowledge/route.ts
│   │           └── scrape-universities/route.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomTabBar.tsx      ← 底部5个Tab导航
│   │   │   ├── MobileContainer.tsx   ← 手机端容器（max-w-[480px]）
│   │   │   └── Header.tsx
│   │   ├── ai/
│   │   │   ├── AIChat.tsx            ← 主对话组件（管理消息流）
│   │   │   ├── AiMessage.tsx         ← AI 消息气泡
│   │   │   ├── UserMessage.tsx
│   │   │   ├── ModeTabs.tsx          ← 四模式切换
│   │   │   ├── QuickButtons.tsx      ← 快捷回复按钮
│   │   │   ├── ScoreCard.tsx         ← 初评分卡（嵌入对话）
│   │   │   ├── UploadPrompt.tsx      ← 文件上传区
│   │   │   ├── MatchList.tsx         ← 教授匹配列表（嵌入对话）
│   │   │   ├── EmailPreview.tsx      ← 套磁信预览
│   │   │   ├── PaperCard.tsx         ← 论文引用卡片
│   │   │   ├── ConfidenceBadge.tsx   ← 置信度标注 🟢🟡🔴⚠
│   │   │   ├── SourceTag.tsx         ← [Source: xxx] 标签
│   │   │   ├── FeedbackBar.tsx       ← 👍🤔👎📝
│   │   │   ├── ProfessorLink.tsx     ← 教授关联卡片
│   │   │   ├── DailyTask.tsx         ← 每日任务
│   │   │   ├── AchievementBadge.tsx  ← 成就徽章
│   │   │   └── ProgressBar.tsx       ← Research Readiness 进度条
│   │   ├── professor/
│   │   │   ├── ProfCard.tsx
│   │   │   ├── ProfDetail.tsx
│   │   │   ├── GrantList.tsx
│   │   │   ├── PaperList.tsx
│   │   │   ├── OpportunityBadge.tsx  ← Opportunity Signal 显示
│   │   │   └── ShareBar.tsx
│   │   ├── blog/
│   │   │   ├── BlogCard.tsx
│   │   │   └── BlogDetail.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Chip.tsx
│   │       ├── KoalaAvatar.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             ← 浏览器端 Supabase client
│   │   │   └── server.ts            ← 服务器端 Supabase client（用 service_role_key）
│   │   ├── server/                   ← 只在服务器端运行，绝不 import 到前端
│   │   │   ├── anthropic.ts         ← Claude API 封装
│   │   │   ├── semantic-scholar.ts  ← Semantic Scholar API
│   │   │   ├── rag-engine.ts        ← 科研深潜 RAG 引擎
│   │   │   ├── matching-engine.ts   ← 教授匹配算法
│   │   │   ├── email-generator.ts   ← 套磁信生成
│   │   │   ├── report-generator.ts  ← PDF 报告生成
│   │   │   ├── sensitive-filter.ts  ← 敏感词过滤
│   │   │   └── embedding.ts         ← OpenAI embedding 调用
│   │   ├── prompts/
│   │   │   ├── system.ts            ← 全局 System Prompt
│   │   │   ├── path-assessment.ts   ← 路径评估模式 Prompt
│   │   │   ├── research-dive.ts     ← 科研深潜模式 Prompt
│   │   │   ├── companion.ts         ← 陪伴模式 Prompt
│   │   │   ├── writing.ts           ← 文案模式 Prompt
│   │   │   └── email.ts             ← 套磁信生成 Prompt
│   │   ├── constants.ts              ← 颜色、字体、品牌信息
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useAIChat.ts              ← AI 对话状态管理
│   │   ├── useProfessors.ts
│   │   ├── useCredits.ts             ← 积分状态
│   │   ├── useAchievements.ts
│   │   └── useDailyTasks.ts
│   │
│   └── types/
│       ├── professor.ts
│       ├── student.ts
│       ├── match.ts
│       ├── outreach.ts
│       ├── conversation.ts
│       └── index.ts
│
├── scripts/
│   ├── professor_collector.py        ← 教授自动采集
│   ├── knowledge_builder.js          ← 知识库构建
│   └── import_professors.ts          ← 导入采集数据到 Supabase
│
├── supabase/
│   ├── schema.sql                    ← 完整建表
│   ├── seed.sql                      ← 敏感词种子数据
│   └── functions.sql                 ← pgvector 搜索函数
│
└── vercel.json                       ← Cron job 配置
```

---

## 关键 API 接口规范

### POST /api/ai/chat

这是最核心的接口。所有 4 个 AI 模式都走这个接口。

```typescript
// Request
{
  mode: "path" | "research" | "chat" | "write",
  messages: Array<{ role: "user" | "assistant", content: string }>,
  professorContext?: {  // 从教授详情页跳转时附带
    professorId: string,
    name: string,
    institution: string,
    researchTags: string[],
  },
  userStyleProfile?: {  // 自适应语气（前端在前3轮后计算传入）
    sentenceLength: "short" | "medium" | "long",
    formality: "casual" | "mixed" | "formal",
    usesEmoji: boolean,
    expertise: "beginner" | "intermediate" | "expert",
    emotionalState: "anxious" | "neutral" | "motivated",
  }
}

// Response
{
  reply: string,            // AI 回复内容（Markdown）
  citations?: Array<{       // 科研深潜模式才有
    title: string,
    authors: string,
    year: number,
    journal: string,
    doi: string,
    url: string,
  }>,
  matchedProfessors?: Array<{  // 路径评估 Stage 3 才有
    professorId: string,
    name: string,
    institution: string,
    matchScore: number,
    reason: string,
  }>,
  scoreCard?: {             // 路径评估 Stage 1 才有
    totalScore: number,
    dimensions: Array<{ name: string, score: number }>,
  },
  suggestConsultation?: boolean,  // 是否引导到真人咨询
  achievement?: string,     // 如果触发了新成就
}
```

**处理逻辑（伪代码）：**

```typescript
export async function POST(req: Request) {
  const { mode, messages, professorContext, userStyleProfile } = await req.json();
  
  // 1. 加载对应模式的 System Prompt
  let systemPrompt = getBaseSystemPrompt();  // 全局品牌红线
  systemPrompt += getModePrompt(mode);       // 模式专用指令
  
  // 2. 如果有用户风格画像，追加到 System Prompt
  if (userStyleProfile) {
    systemPrompt += `\n\n用户说话风格：${describeStyle(userStyleProfile)}。请匹配用户风格回复。`;
  }
  
  // 3. 如果是科研深潜模式，执行 RAG
  let ragContext = "";
  if (mode === "research") {
    const lastMsg = messages[messages.length - 1].content;
    
    // 并行检索（Promise.all，不要串行！）
    const [papers, knowledge, professors] = await Promise.all([
      searchSemanticScholar(lastMsg),      // lib/server/semantic-scholar.ts
      searchKnowledgeBase(lastMsg),         // lib/server/rag-engine.ts
      searchProfessorsByTag(lastMsg),       // lib/server/matching-engine.ts
    ]);
    
    ragContext = assembleRAGContext(papers, knowledge, professors);
    systemPrompt += `\n\n检索到的参考资料：\n${ragContext}`;
  }
  
  // 4. 如果有教授 context（从详情页跳转）
  if (professorContext) {
    systemPrompt += `\n\n用户正在了解的教授：${JSON.stringify(professorContext)}`;
  }
  
  // 5. 调用 Claude API
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });
  
  // 6. 后处理
  const reply = response.content[0].text;
  const result = postProcess(reply, mode);  // 提取引用、检查无来源数据
  
  // 7. 保存对话记录到数据库
  await saveConversation(mode, messages, result);
  
  // 8. 检查是否应该引导咨询
  result.suggestConsultation = shouldSuggestConsultation(messages, mode);
  
  // 9. 检查是否触发成就
  result.achievement = checkAchievements(messages, mode);
  
  return Response.json(result);
}
```

### POST /api/outreach/generate

```typescript
// Request
{
  professorId: string,
  studentProfileJson: object,  // AI 分析后的学生结构化数据
  tone: "professional" | "warm" | "direct" | "academic",
  purpose: "PhD" | "MRes" | "RA" | "Scholarship",
}

// Response
{
  emailId: string,
  subjectLine: string,
  emailBody: string,
  followupBody: string,
  riskNote: string,        // 内部提醒，不发给教授
  creditsUsed: number,
  remainingCredits: number,
}
```

**关键：生成前必须检查用户积分余额。余额不足返回 402 + 引导购买。**

### GET /api/professors

```typescript
// Query params
{
  search?: string,          // 搜索教授名/方向/学校
  institution?: string,     // 筛选学校
  status?: "open" | "all",  // 仅看在招
  sort?: "h_index" | "funding" | "opportunity" | "updated",
  page?: number,
  limit?: number,           // 默认 20
}

// Response
{
  professors: Array<Professor>,
  total: number,
  page: number,
}
```

---

## Semantic Scholar API 规范

```
Base URL: https://api.semanticscholar.org/graph/v1

论文搜索:
GET /paper/search?query={query}&limit=15&fields=paperId,title,year,citationCount,journal,externalIds,url,abstract&year={yearFrom}-

作者搜索:
GET /author/search?query={name}&limit=5&fields=authorId,name,affiliations,citationCount,hIndex,paperCount,url

作者论文:
GET /author/{authorId}/papers?limit=10&fields=paperId,title,year,citationCount,journal,externalIds,url,abstract&sort=citationCount:desc

限速：
- 无 API key: 1 req/sec, 1000 req/day
- 有 API key: 10 req/sec, 10000 req/day
- 请求头: x-api-key: {SEMANTIC_SCHOLAR_API_KEY}

重要：
- 搜索结果可能不精确，必须验证 affiliations 是否包含目标大学
- 如果匹配不到，设置 semantic_scholar = null，绝不编造
- DOI 链接格式: https://doi.org/{doi}
```

---

## Supabase pgvector 搜索函数

```sql
-- 必须在 Supabase SQL Editor 中创建此函数
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT id, source_type, source_title, content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

调用方式（在 rag-engine.ts 中）：
```typescript
const { data } = await supabase.rpc('match_knowledge', {
  query_embedding: embedding,  // 1536维数组
  match_threshold: 0.7,
  match_count: 10,
});
```

---

## 品牌常量（src/lib/constants.ts）

```typescript
export const BRAND = {
  name: "Koala Study Advisors",
  shortName: "Koala",
  domain: "koalastudy.net",
  email: "info@koalastudy.net",
  address: "Suite 22/26A Lime St, Sydney NSW 2000",
  wechat: "KoalaStudy",
  xiaohongshu: "@dr.koalaau",
  instagram: "@dr.koalaau",
  tagline: "Koala — 陪你从申请到毕业，每一步都在。",
  aiName: "考拉学长",
  aiSubtitle: "你的澳洲学术内线",
  positioning: "澳洲产学研科研机构",  // 绝不说"留学中介"
  mara: "KSA 持有 MARA 注册资质",
} as const;

export const COLORS = {
  bg: "#faf6ec",
  card: "#f2ead6",
  ink: "#1a2332",
  bark: "#7d6340",
  fur: "#a08058",
  gold: "#c4a050",
  goldDark: "#8a6c30",
  euc: "#5a8060",
  terra: "#b06040",
  txt: "#28201a",
  txtSoft: "#584838",
  txtMuted: "#907858",
} as const;

export const FONTS = {
  serif: "'Noto Serif SC', serif",
  en: "'Fraunces', Georgia, serif",
  mono: "'JetBrains Mono', monospace",
  body: "'Noto Sans SC', sans-serif",
} as const;
```

---

## 常见错误预防

### ❌ 不要做的事

1. **不要在前端直接调用 Claude API** — 所有 AI 调用必须走 /api/ai/chat
2. **不要在前端 import `lib/server/` 下的任何文件** — 会暴露 API key
3. **不要用 localStorage** — Artifact 环境不支持，用 React state 或 Supabase
4. **不要编造教授数据** — 示例数据可以用，但标注"示例数据"
5. **不要串行调用 API** — RAG 的三个数据源必须 Promise.all 并行
6. **不要忽略 Semantic Scholar 限速** — 加 delay，无 key 时 1req/sec
7. **不要把 sensitive_words 表的数据硬编码** — 从数据库读取，Admin 可维护
8. **不要在 AI 回复中使用"保录取""保奖学金"** — System Prompt 已禁止，但代码层也要做 compliance check
9. **不要假设用户是桌面端** — 所有 UI 先为 375px 宽度设计
10. **不要在每条 AI 消息中都推销咨询** — 只在 shouldSuggestConsultation() 返回 true 时

### ✅ 必须做的事

1. **每个教授数据点旁边标注来源** — "via ARC Portal" / "via Semantic Scholar" / "via {大学} website"
2. **每次 AI 对话保存到 ai_conversations 表**
3. **每次反馈保存到 feedback 表**
4. **套磁信生成前检查积分余额**
5. **科研深潜模式的回答必须包含 [Source] 标注**
6. **教授职称使用真实职称，不统一叫"教授"**
7. **所有社媒内容经过 sensitive_filter 过滤**
8. **PDF 报告包含免责声明**
9. **NIV 工具包含 MARA 声明和免责**
10. **移动端底部 Tab 的 Koala 图标要从底栏凸起**

---

## 开发顺序建议

```
Week 1: 基础设施
├── Next.js 项目 + Tailwind + TypeScript 配置
├── Supabase 建库 + schema.sql + functions.sql
├── src/lib/ 下所有 server 端工具函数
├── src/types/ 全部类型定义
└── src/lib/constants.ts + prompts/

Week 2: 前端页面（Mobile-First）
├── BottomTabBar + MobileContainer
├── 首页
├── 教授列表 + 详情（先用 mock 数据）
├── 博客列表
├── 工具页 + NIV
└── AI 对话页基础 UI（消息流 + 输入框 + 模式切换）

Week 3: AI 核心功能
├── /api/ai/chat 四模式全部接通
├── RAG 引擎（Semantic Scholar + pgvector）
├── 路径评估 3 阶段完整流程
├── 套磁信生成 + 积分系统
├── 自适应语气引擎
└── 反馈收集

Week 4: 数据管线 + 后台
├── professor_collector.py 运行 + 数据导入
├── knowledge_builder.js 运行
├── 后台 Dashboard 基础结构
├── 采集管线监控面板
├── 教授审核功能
└── 内容生成器

Week 5: 打磨 + 部署
├── 每日任务 + 成就系统
├── PDF 报告生成
├── 对话导出
├── 分享功能
├── Vercel 部署 + Cron 配置
└── DNS 切换
```

---

## 给 Claude Code 的一句话总结

```
Koala PhD is an AI-first platform where users chat with "考拉学长" to get free professor matching, then pay AUD 1/email for customized cold outreach letters. The backend auto-collects professor data from ARC Portal + Semantic Scholar + university websites. The AI adapts to each user's communication style and provides emotional support alongside practical PhD application guidance. All professor data must cite sources. Never say "guaranteed admission" or "guaranteed scholarship". Mobile-first design with bottom tab navigation.
```
# CLAUDE.md — Koala PhD 项目开发规则
# Claude Code 每次执行任务前必须遵守以下规则

## 铁律（违反任何一条都不可接受）

### 1. 先看后改
- **改任何文件前必须先 `view` 该文件**
- 不要猜测代码结构、变量名、函数名
- 不要假设 import 路径，先看项目中已有的 import 方式

### 2. 改完必须验证
- 修改 state 后，确认 UI 会刷新（setXxx 被调用）
- 修改 API 后，确认前端调用了该 API 并处理了返回值
- 删除操作后，确认前端列表移除了该项（filter/splice）
- 添加操作后，确认前端列表新增了该项（push/concat）
- 表单提交后，确认有成功提示 + 页面刷新或跳转

### 3. 不要只做一半
- 写了 API 必须写前端调用
- 写了前端按钮必须写 onClick 处理函数
- 写了删除确认弹窗必须写确认后的逻辑
- 写了 fetch 必须处理成功和失败两种情况
- 改了后端数据必须刷新前端 state

### 4. 角色权限检查
- Sales 不能进 /dashboard/koala（重定向到 /dashboard/sales）
- Admin 不能进 /dashboard/sales（重定向到 /dashboard/koala）
- 只有 Sales 能生成推广二维码，Admin 不能
- Admin 看聚合数据，不看客户个人信息
- Sales 只看自己推广的客户，看不到别人的

### 5. 样式规则
- 后台 /dashboard/* 固定浅色（bg-white/bg-gray-50 + text-gray-900）
- 前台 /koala/* 支持深浅色切换（用 dark: 前缀）
- 调研问卷 /s/* 深色背景 + 白色文字
- 金色 #D4A843 只做装饰/badge/图标，不做正文颜色
- 主按钮用深海军蓝 bg-[#1A1A2E] text-white

## 开发流程

### 修 Bug 的标准流程
```
1. 先 view 相关文件，找到问题代码
2. 理解当前逻辑（不要凭猜测修改）
3. 修改代码
4. 确认修改涉及的所有环节都更新了（API + 前端 state + UI 刷新）
5. npm run build 确认没有编译错误
6. git add -A && git commit -m "fix: 描述" && git push
```

### 新功能的标准流程
```
1. view 相关目录和文件，了解现有结构
2. 复用已有的代码风格（supabase 初始化方式、API 格式、组件风格）
3. 按顺序创建：数据库（如需要）→ 服务层 → API → 组件 → 页面
4. 每层完成后确认能被下一层正确调用
5. npm run build 确认通过
6. git push
```

## 项目信息

- **框架**: Next.js 16 + Supabase + Tailwind CSS
- **域名**: koalaphd.com
- **Supabase 项目 ID**: geolbgirpkzxrdvozmqw
- **Super Admin**: renehee@hotmail.com + yangxianzeng2021@gmail.com
- **语言**: 与开发者沟通用中文
- **Supabase Admin Client**: 查找项目中已有的初始化方式，不要自己猜

## 禁止事项

- ❌ 不要创建已存在的数据库表（所有表已建好）
- ❌ 不要用 npm qrcode 包生成二维码（用 api.qrserver.com 免费 API）
- ❌ 不要在公开页面 /s/* 放任何 /dashboard 链接
- ❌ 不要用 www.koalaphd.com 绝对路径（用相对路径 /koala/home）
- ❌ 不要在浅色后台用深色背景 class（bg-gray-900 等）
- ❌ 不要在手机号输入的 onValueChanged 中拼接区号（区号只在提交时合并）

## 追溯更新规则

当修复了影响历史数据的 bug 时，必须同时处理已有数据：

1. 修复注册积分逻辑后 → 检查所有历史注册用户，对漏发积分的补发
2. 修复邀请码逻辑后 → 检查所有有邀请关系但积分没到账的，补发
3. 修复价值评分算法后 → 对所有已有的 survey_responses 重新计算 value_score
4. 修复客户阶段同步后 → 对所有现有客户重新同步漏斗数据

执行方式：修完代码后写一个一次性的修复脚本（或 SQL），对历史数据按新逻辑重新处理。
脚本命名：scripts/backfill-{功能名}-{日期}.ts
跑完后脚本保留在 scripts/ 目录作为记录，不删除。

## 强制使用 OpenSpec 工作流

所有代码修改任务必须使用 OpenSpec 流程，禁止直接改代码。

标准流程：
1. /opsx:new {需求} → 创建任务
2. /opsx:ff → 调研 + 制定方案
3. /opsx:apply → 实施修改
4. /opsx:verify → 验证（npm run build + 功能测试）
5. /opsx:archive → 归档

不得跳过任何步骤，不得用简化格式替代。

例外：一行代码的简单修复或紧急故障可跳过。

## 设计规范

所有前端页面开发必须遵循设计系统规范：

- **设计系统**: `docs/design-system/DESIGN.md` — 色彩、字体、间距、组件样式
- **网页开发技能**: `docs/design-system/SKILL-web-page.md` — 页面开发流程与规范
- **使用说明**: `docs/design-system/README.md` — 设计系统概览与引用方式

## Sentry 错误检查
修复 bug 前先查 Sentry 最新错误：
curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" "https://sentry.io/api/0/projects/assa-investment-group/javascript-nextjs/issues/?query=is:unresolved&sort=date&limit=10"

## 硬规则（不可违反）
### Push 前必须 build 通过
任何 git push 前本地 npm run build 必须通过。
两道闸门：
- .claude/hooks/pre-push-check.sh — Claude Code 层拦截（exit 2）
- .husky/pre-push — git 层拦截
禁止 --no-verify 或任何绕过手段。
