 # Koala 项目架构分析报告

> 生成日期：2026-06-04
> 项目：koala-marketing-manager（Koala PhD AI Advisor 平台）
> 技术栈：Next.js 16 (App Router) + React 19 + TypeScript + Supabase + Tailwind CSS 4

---

## 0. 一句话总览

这是一个 **Next.js App Router 全栈单体（full-stack monolith）** 项目。前端、后端 API、服务层、数据库 schema 全部在同一个仓库里。前后端不是物理分离的两套工程，而是靠 **目录约定 + 文件命名** 来区分：

- `page.tsx` / `layout.tsx` / `components/` → **前端**（浏览器渲染）
- `app/api/**/route.ts` → **后端**（Serverless API 路由）
- `app/lib/server/` → **后端专用服务层**（绝不能被前端 import）
- `supabase/` → **数据库**（建表 SQL + migrations）

---

## 1. 顶层目录速览

| 目录 / 文件 | 性质 | 作用 |
|---|---|---|
| `app/` | 前端 + 后端 | Next.js App Router 核心：页面、API、布局 |
| `app/lib/` | 后端为主 | 服务层、工具函数、Prompt 库、Supabase client |
| `lib/` | 共享 | 仅 `metrics-glossary.ts`（指标口径文案） |
| `components/` | 前端 | 全局共享 UI（`metric-label`、`number-input`） |
| `supabase/` | 数据库 | 建表 SQL + `migrations/`（26 个迁移）+ pgvector 函数 |
| `scripts/` | 工具/运维 | 数据采集、回填、检查、种子脚本（一次性运行，非运行时） |
| `docs/` | 文档 | PRD、设计系统、各类审计与规格文档 |
| `openspec/` | 流程 | OpenSpec 变更管理（changes + specs），开发工作流 |
| `design/` | 设计稿 | Figma 导出的页面原型（首页、AI对话页等） |
| `public/` | 前端静态 | 图片、海报、Ola 吉祥物素材 |
| `middleware.ts` | 后端 | 路由守卫 + Sales 归因（每个请求都过） |
| `next.config.ts` / `tsconfig.json` / `vercel.json` | 配置 | 构建、Cron、部署配置 |
| `instrumentation*.ts` / `sentry.*.config.ts` | 监控 | Sentry 错误追踪 |

---

## 2. 前端部分（Browser / Client + Server Components）

前端按 **三个独立产品域** 划分，每个域有自己的布局和导航：

### 2.1 `app/koala/` — C 端用户前台（移动优先）
面向终端学生用户的 AI PhD 顾问产品。Mobile-first（375px），有底部 Tab 导航（`BottomTabBar`）。

| 路由 | 功能 |
|---|---|
| `koala/home` | 首页 |
| `koala/chat` | **核心**：AI 全屏对话（考拉学长） |
| `koala/professors` + `[id]` | 教授列表 / 详情 |
| `koala/matches` | 教授匹配结果 |
| `koala/discover` | 发现页 |
| `koala/blog` + `[id]` | 博客列表 / 详情 |
| `koala/tools` + `tools/niv` | 工具集（NIV 评估器） |
| `koala/pricing` | 定价 / 订阅 |
| `koala/my-profile`、`my-applications`、`my-documents`、`my-emails`、`my-progress` | 个人中心（资料、申请、文档、套磁信、进度） |
| `koala/insights` | 科研洞察 |
| `koala/messages` | 消息 |
| `koala/auth` + `register` | 登录注册 / 找回密码 |
| `koala/professor-portal` | 教授入驻门户 |

**子组件库** `app/koala/components/`：
- `ai/` — 对话内嵌组件（ScoreCard、PaperCitationCard、ConfidenceBadge、ProgressBar…）
- `chat/` — 对话产物卡片（ColdEmailCard、CVPreviewCard、ProfileCard、UpgradePrompt…）
- `ola/` — **Ola AI 吉祥物**系统（OlaWidget、OlaChatMascot、OlaTriggerEngine、OlaCelebration…）
- `outreach/` — 套磁信流程（BatchEmailFlow、EmailPackage、SendTutorial）
- 顶层：`KoalaShell`、`BottomTabBar`、`TopNavBar`、`AuthContext`、`GmailContext`、`KoalaAvatar`

### 2.2 `app/dashboard/` — B 端后台管理（桌面，浅色固定）
分两个角色子域：

- **`dashboard/koala/`（Admin 后台）** — 60+ 页面，是项目最大的前端区块。涵盖：
  - 教授管理（professors / sync / quality / verified / contributed）
  - 内容运营（blog 草稿/已发/排期、ai-content、knowledge-base、topics、publishing）
  - 销售管理（sales-overview / sales-funnel / sales-agents / sales-audit、commission-rates/review、tier-management、kpi）
  - 数据分析（analytics、revenue、growth、admin-overview、ola-analytics、memory-graph、evolution）
  - 用户与权限（users、roles、work-logs、feedback）
  - 调研问卷（surveys：create/edit/responses/analytics/share）
  - Ola 配置（ola-triggers、faq、handoff、triggers、evolution）

- **`dashboard/sales/`（销售后台）** — 销售员自己的视图：
  - `promo-center` / `promo-tools` — 推广物料、二维码海报
  - `referral-users` — 自己拉来的客户
  - `customer/[id]` — 客户时间线
  - `my-commissions` / `my-kpi` / `my-logs` — 佣金、KPI、工作日志
  - `channel-analytics` — 渠道分析
  - `surveys/*` — 销售自己的调研问卷

### 2.3 公开 / 落地页（无导航壳）
- `app/page.tsx` — Business Selector 首页（Koala / Lucent / Teddy 三业务卡）
- `app/s/[code]` — **公开调研问卷落地页**（深色，给客户填，禁放 dashboard 链接）
- `app/r/[code]/route.ts` — 推广短链跳转（重定向 + 归因）
- `app/professor/[slug]`、`professor/claim`、`professor/dashboard` — 教授公开页/认领/门户
- `app/login`、`app/auth/*` — 登录与 OAuth 回调
- `app/privacy-policy`、`app/terms` — 法务页

### 2.4 全局前端基建
- `app/layout.tsx` — Root layout（字体、Provider）
- `app/globals.css` — 全局样式
- `app/manifest.ts` / `robots.ts` / `sitemap.ts` — SEO / PWA
- `app/global-error.tsx` / `not-found.tsx` — 错误与 404
- `components/ui/` + `app/components/` — 跨域共享组件（survey 渲染器、SharePoster、BannerCarousel、VoiceInputButton、语言切换）

---

## 3. 后端部分（Serverless API + 服务层）

### 3.1 `app/api/**/route.ts` — API 路由层（HTTP 入口）
~180 个端点，按业务分组。关键分组：

| 分组 | 职责 |
|---|---|
| `api/ai/*` | **核心 AI**：`chat`（四模式对话）、`export`（PDF）、`feedback`、`professor-match` |
| `api/chat/*` | 对话产物：`extract-profile`、`generate-cold-email(s)`、`generate-follow-up`、`professor-preview` |
| `api/ola/*` | Ola 吉祥物后端：sessions、conversations、matchmaking、handoff、triggers、reengagement、rating |
| `api/professors/*` + `api/professor/*` | 教授搜索/详情/计数、web-search、import-from-url、claim、verify、job-posting、recommended-students |
| `api/professor-portal/*` | 教授入驻：me、recruit、verify |
| `api/outreach/*` | 套磁信：generate(batch)、send、credits、status |
| `api/user/*` | 用户中心：profile、credits、documents、cv、applications、memories、referral、gmail、send-email… |
| `api/sales/*` | 销售系统：attribute、track-visit/registration、customers、funnel、commissions、kpi、qrcode、weekly-report |
| `api/admin/*` | 后台数据：50+ 端点，dashboard-overview、users、roles、revenue、kpi、knowledge、sales-*、ola-* |
| `api/blog/*` | 博客生成全流程：generate、ai-assist、cover、illustration、batch-generate、topics |
| `api/surveys/*` | 问卷 CRUD、responses、analytics、templates、qrcodes、public |
| `api/stripe/*` + `api/webhooks/stripe` | 支付：checkout、portal、subscription、upgrade + Webhook |
| `api/webhooks/resend` | 邮件事件回调 |
| `api/auth/*` | 注册、邮箱验证、找回密码、Gmail OAuth |
| `api/cron/*` | **定时任务**（Vercel Cron 触发）：sync-professors、refresh-professors、followup-check、ola-evolution、ola-reengagement、auto-confirm-commissions、weekly-sales-report、fetch-sydney-events、cleanup-conversations |
| `api/inngest` | Inngest 后台任务队列入口 |
| `api/voice/transcribe`、`api/niv/assess`、`api/report/generate`、`api/share/poster`、`api/social/sensitive-check`、`api/insights/*`、`api/stats/*` | 其它功能端点 |

### 3.2 `app/lib/server/` — 后端服务层（⚠️ 禁止前端 import）
封装第三方 API 与核心算法，持有敏感 key：
- `anthropic.ts` — Claude API 封装
- `semantic-scholar.ts` / `academic-search.ts` — 论文/学术检索
- `embedding.ts` — OpenAI 向量
- `rag-engine.ts` — 科研深潜 RAG（pgvector 检索）
- `matching-engine.ts` — 教授匹配算法
- `email-generator.ts` — 套磁信生成
- `research-analysis.ts` / `profile-parser.ts` / `student-context.ts` / `adaptive-tone.ts` — 内容分析与自适应语气
- `credits.ts` / `commission.ts` / `stripe.ts` — 积分、佣金、支付
- `sensitive-filter.ts` — 敏感词过滤
- `slack.ts` — 告警通知
- `pdf-fonts.ts` — PDF 字体

### 3.3 `app/lib/services/` — 业务服务层（部分可前后端共用）
更偏业务逻辑编排：`professorService`、`coldEmailService`、`emailService`、`surveyService`、`grantService`、`memoryService`、`olaMatchmakingService`、`olaMemoryService`、`olaReflectionService`、`publishingService`、`topicService`、`usageTracker`、`applicationSync`、`deviceFingerprint` 等。

### 3.4 `app/lib/` 其它后端/共享模块
- `prompts/` — **AI Prompt 库**（system、path-assessment、research-dive、companion、writing、email、ola-persona、rp、interview）
- `ola/` — Ola 领域逻辑（emotion、milestones、deadlines、session、events、faq）
- `supabase/client.ts`（浏览器）/ `supabase/server.ts`（service_role，服务端）
- `inngest/`（client + functions）— 后台异步任务定义
- `email/`（resend + 模板）、`chat/extract-profile`、`ai/generateContent`
- `auth.ts`、`ratelimit.ts`（Upstash）、`constants.ts`、`database.types.ts`、`store.ts`、`theme.tsx`、`i18n.ts`、`worklog.ts`、`notifications.ts`
- `eval/` — AI 质量评测套件（test-ai-chat、test-anti-hallucination、test-knowledge…，对应 `npm run eval`）

### 3.5 `middleware.ts` — 全局请求拦截（后端边缘逻辑）
每个请求都会过，两大职责：
1. **Sales 归因**：解析 `?ref=&ch=` → 写 `koala_ref` / `koala_visitor` cookie → 用 service_role 写 `sales_visits` 表。
2. **路由守卫**：`/dashboard/*` 未登录 → 跳 `/login`；已登录访问 `/login` → 跳 `/dashboard/koala`。
   （注：CLAUDE.md 要求的「Sales 不能进 koala 后台 / Admin 不能进 sales」更细的角色重定向，部分在各 `layout.tsx` 内做。）

### 3.6 数据库 `supabase/`
- `schema.sql` — 主建表
- `functions.sql` — pgvector `match_knowledge` 等 SQL 函数
- `migrations/`（26 个）— 增量迁移
- 主题化 SQL：`user-system`、`user_roles`、`credits-system`、`stripe-integration`、`blog-tables`、`papers`、`professor-profile-extended`、`rls-hardening`（RLS 安全加固）等

---

## 4. 连接逻辑（数据如何在各层之间流动）

### 4.1 标准请求链路（前端 → 后端 → DB → 第三方）

```
浏览器 (app/koala/** page.tsx, "use client")
   │  fetch('/api/...')
   ▼
middleware.ts  ── 归因写 cookie + 路由守卫 ──┐
   │                                          ▼
app/api/**/route.ts  (后端入口, 解析+校验)   重定向/放行
   │  调用
   ▼
app/lib/server/*  &  app/lib/services/*   (业务逻辑/算法, 持有 secret key)
   │  ├─► Anthropic Claude API   (anthropic.ts)
   │  ├─► OpenAI Embedding       (embedding.ts)
   │  ├─► Semantic Scholar       (semantic-scholar.ts)
   │  ├─► Stripe / Resend / Slack
   │  └─► Supabase (server.ts, service_role)
   ▼
Supabase Postgres + pgvector  (supabase/schema.sql 定义的表)
   │  返回
   ▼
route.ts 组装 JSON ──► 前端 setState ──► UI 刷新
```

### 4.2 AI 对话核心链路（最重要）

```
koala/chat/page.tsx
  └─ POST /api/ai/chat  { mode, messages, professorContext?, userStyleProfile? }
       ├─ app/lib/prompts/*      → 按 mode 拼 System Prompt
       ├─ (research 模式) app/lib/server/rag-engine.ts
       │     Promise.all[ semantic-scholar + pgvector match_knowledge + matching-engine ]
       ├─ app/lib/server/anthropic.ts  → Claude (claude-sonnet-4-6)
       ├─ 后处理：提取 citations / scoreCard / matchedProfessors
       └─ 写 ai_conversations 表 → 返回 reply(+附件) 给前端内嵌组件渲染
```

### 4.3 销售归因闭环（middleware 驱动）

```
推广短链 /r/[code]  →  /s/[code] 问卷落地页 (?ref=&ch=)
   │ middleware 写 koala_ref cookie + sales_visits 表
   ▼
用户注册  →  /api/sales/track-registration  →  绑定 referrer
   ▼
转化/付费  →  /api/stripe/webhook  →  /api/sales/attribute → commission 计算
   ▼
dashboard/sales/* (销售看自己的) + dashboard/koala/sales-* (Admin 看聚合)
```

### 4.4 异步 / 定时任务

```
Vercel Cron (vercel.json)  →  /api/cron/*   定时拉教授数据 / 跟进检查 / Ola 进化 / 周报
Inngest                    →  /api/inngest  →  app/lib/inngest/functions.ts  事件驱动后台任务
Stripe / Resend Webhook    →  /api/webhooks/*  外部事件回调
```

### 4.5 角色路由隔离（三套前端壳）

| 角色 | 入口 | 前端壳 | 后端数据源 |
|---|---|---|---|
| C 端用户 | `/koala/*` | `KoalaShell` + `BottomTabBar` | `api/user`、`api/ai`、`api/ola` |
| 销售 | `/dashboard/sales/*` | `dashboard/sales/layout.tsx` | `api/sales/*` |
| Admin | `/dashboard/koala/*` | `dashboard/koala/layout.tsx` | `api/admin/*` |

---

## 5. 边界与约定（红线）

1. **`app/lib/server/` 绝不能被前端组件 import** —— 否则泄露 `SUPABASE_SERVICE_ROLE_KEY`、`ANTHROPIC_API_KEY`。前端要用服务端数据一律走 API Route。
2. **两个 Supabase client**：`supabase/client.ts`（浏览器、anon key）vs `supabase/server.ts`（服务端、service_role）。
3. **前端调 AI 必须走 `/api/ai/chat`**，不能在浏览器直连 Claude。
4. **样式分区**：`/dashboard/*` 固定浅色；`/koala/*` 支持深浅切换；`/s/*` 深色问卷。
5. **`scripts/` 不是运行时代码** —— 是 `npx tsx` 手动跑的数据采集/回填/检查脚本（采集教授、生成 embedding、种子知识库、冒烟检查）。

---

## 6. 一张图总结分层

```
┌─────────────────────────────────────────────────────────────┐
│  前端 (Frontend)                                              │
│  app/koala/**         C端用户 (mobile, AI对话)               │
│  app/dashboard/koala  Admin 后台 (60+页)                     │
│  app/dashboard/sales  销售后台                               │
│  app/s /r /professor  公开落地页                             │
│  components/ app/components/ koala/components/  共享UI        │
└───────────────┬─────────────────────────────────────────────┘
                │ fetch  ▲ 每个请求经过 middleware.ts (归因+守卫)
┌───────────────▼─────────────────────────────────────────────┐
│  后端 (Backend, Serverless)                                  │
│  app/api/**/route.ts   ~180 端点 (HTTP 入口)                 │
│  app/lib/server/*      第三方封装+算法 (持 secret)           │
│  app/lib/services/*    业务编排                              │
│  app/lib/prompts /ola /inngest /email   领域逻辑            │
│  app/api/cron + inngest + webhooks       异步/定时           │
└───────────────┬─────────────────────────────────────────────┘
                │ Supabase JS (service_role)
┌───────────────▼─────────────────────────────────────────────┐
│  数据库 (Supabase Postgres + pgvector)                       │
│  supabase/schema.sql · migrations/ · functions.sql          │
└─────────────────────────────────────────────────────────────┘
        ▲ scripts/ (离线数据采集/回填/检查, 非运行时)
        ▲ 第三方: Anthropic · OpenAI · Semantic Scholar · Stripe · Resend · Slack · Upstash
```
