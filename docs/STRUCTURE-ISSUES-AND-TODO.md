# Koala 项目结构问题清单 & 重构 To-Do

> 生成日期：2026-06-04
> 配套阅读：[ARCHITECTURE-ANALYSIS.md](./ARCHITECTURE-ANALYSIS.md)（现状地图）
> 本文目的：在「现状地图」基础上，**列出结构性问题** + 给出**可勾选追踪的 To-Do**。
> 用法：完成一项就把 `- [ ]` 改成 `- [x]`，并在行尾补 commit hash / 日期。

---

## 0. 核心结论（一句话）

> **所有东西都堆在 `app/` 里**：不只是页面和 API，连**领域逻辑、服务层、Prompt 库、第三方封装、类型、工具**全部塞进了 `app/lib/`（87 个文件）。
> Next.js 的 `app/` 本该只承载「路由 + UI + HTTP 入口」，现在却成了整个项目的垃圾桶。结果是：**业务逻辑无法脱离 Next.js 独立测试 / 复用 / 迁移**，且单个业务域的代码被摊在 5 个不同目录里。

**关键体量数据（用于衡量重构进度）：**

| 指标 | 当前值 | 说明 |
|---|---|---|
| `app/` 下 .ts/.tsx 文件 | **567** | 几乎全部源码都在 app |
| API route.ts | **270** | HTTP 入口 |
| page.tsx | **116** | 页面 |
| `app/lib/` 文件 | **87** | ← **问题核心：领域层寄生在 app 里** |
| 根 `lib/` 文件 | 1 | 只有 metrics-glossary，与 app/lib 割裂 |
| 组件目录数量 | **4 处** | components / app/components / app/koala/components / dashboard 内联 |
| 最大单文件 | **2791 行** | `app/koala/chat/page.tsx` |
| route.ts > 300 行 | 9 个 | 业务逻辑写在 controller 里 |
| 路由内联 `createClient(SERVICE_ROLE)` | 14 | 未用共享 client，散落 14 处 |
| **CLAUDE.md 行数** | **734 行 / 28KB** | 三份文档拼接，规则重复，内嵌本该外置的内容 |
| 硬编码域名（koalaphd.com 等） | **68 文件** | 迁移隐患，无单一来源 |
| 硬编码 `localhost:3000` | 10 文件 | 含 3 个生产 route |
| script 硬编码 `/Users/jhe/...` 路径 | 2 文件 | **已失效**（非当前机器用户） |

---

## 1. 结构性问题清单

### P0 — 架构地基（必须先解决，否则后面都是补丁）

#### 问题 1：领域逻辑寄生在 `app/lib/`，无法脱离 Next.js
- `app/lib/server/`（17）、`app/lib/services/`（21）、`prompts/`、`ola/`、`inngest/`、`email/`、`ai/`、`chat/` —— 整个后端领域层都在 `app/` 内部。
- 后果：① 这些纯业务逻辑被 Next.js 构建体系绑死；② 想写单元测试、想被 `scripts/` 复用、想抽成独立 package 都很别扭；③ 「app = 路由层」的语义被破坏，新人无法靠目录判断「哪些是框架表层、哪些是核心业务」。
- 佐证：根目录已有一个 `lib/`（只放了 1 个文件），说明「该把共享逻辑放哪」本身就没有约定，两个 `lib` 并存。

#### 问题 2：没有 `src/`，且实际结构与文档约定严重背离
- `CLAUDE.md` 白纸黑字写的是 `src/app`、`src/lib`、`src/components`、`src/types`，**但仓库里根本没有 `src/`**，全是扁平的 `app/`、`app/lib/`、散落的 `components/`。
- 后果：项目自带的「权威文件结构文档」与现实对不上，任何照文档写代码的人（或 AI）都会放错位置，进一步加剧混乱。

#### 问题 3：代码按「技术类型 + 页面壳」组织，而非按「业务域」
- 同一个业务域（例如「教授 professor」）的代码被摊在：`app/api/professors/*` + `app/api/professor/*` + `app/lib/server/matching-engine.ts` + `app/lib/services/professorService.ts` + `app/koala/components/professor/*` + `app/dashboard/koala/professors/*`。
- 「outreach 套磁信」「sales 归因」「ola 吉祥物」「survey 问卷」「blog」同理，每个域都被切成 5 片。
- 后果：改一个功能要在 5 个目录间跳；无法判断一个域的「全貌」与「边界」；难以让不同的人/AI 各自负责一个域。

### P1 — 可维护性（高频踩坑）

#### 问题 4：God 文件（巨型页面 / 巨型路由）
- `koala/chat/page.tsx` **2791 行**、`my-profile/page.tsx` 2053、`api/ai/chat/route.ts` **1917**、`dashboard/koala/blog/page.tsx` 1448、`blog/edit/page.tsx` 1334、`professors/ProfessorsClient.tsx` 1304。
- 后果：单文件混杂状态管理 + 数据请求 + 渲染 + 业务规则，难 review、易冲突、AI 改动易误伤。

#### 问题 5：Fat Controller —— 业务逻辑写在 route.ts 里
- 9 个 route.ts 超 300 行（`api/ai/chat` 1917 行最夸张）。route 本应是「解析 → 校验 → 调 service → 返回」的薄控制器，现在把 RAG 编排、Prompt 拼装、后处理都写在 handler 内。
- 后果：逻辑无法被 cron / inngest / 测试复用；同一段逻辑在不同 route 里复制。

#### 问题 6：组件散落 4 处，无统一约定
- 根 `components/`（2）、`app/components/`（15）、`app/koala/components/`（49）、`dashboard` 内联（3）。
- 没有「全局共享 UI vs 域内组件」的清晰分层，跨域复用靠记忆。

#### 问题 7：类型定义无家可归
- `app/types/` 里只有 `speech.d.ts`；`database.types.ts` 埋在 `app/lib/` 深处；大量 interface 内联在组件 / route 里。
- 后果：类型重复定义、前后端契约（如 `/api/ai/chat` 的 Request/Response）没有单一可信源。

### P2 — 一致性 / 安全 / 卫生

#### 问题 8：Supabase 服务端 client 创建不统一
- 214 处用共享的 `app/lib/supabase/server`，但仍有 **14 个 route 内联** `createClient(URL, SERVICE_ROLE)`。
- 后果：14 个潜在的「配置/安全」分叉点，改 client 行为（如加日志、加 RLS 绕过审计）要改 15 个地方。

#### 问题 9：API 层鉴权 / 角色校验靠手写复制
- 16 个 route 内联 `getUser()` / 查 `user_roles`。`middleware.ts` 只守「页面导航」，**不守 API 授权**。
- 后果：每个新 admin/sales 接口都要手抄一遍鉴权，漏写就是越权漏洞。

#### 问题 10：前端无数据访问层，121 个文件裸调 `fetch('/api/...')`
- 没有 `api-client` / hooks 封装，URL、错误处理、loading 态在 121 个文件里各写各的。
- 后果：接口改名要全局搜替；错误处理风格不统一。

#### 问题 11：仓库根目录卫生差
- 存在空文件 `0：`、`koala-changes.patch`、`blog 设计/`、`todo list/`、`SITE_LOGIC.md` 等散落产物；`mockData.ts` 在 `app/lib`（规则要求 `src/lib/mock-data.ts`）。
- 后果：噪音，掩盖真正的源码结构。

#### 问题 12：`CLAUDE.md` 单文件 734 行 / 28KB —— 三份文档拼在一起、规则重复、内容该外置
- 用 `grep '^#'` 一看就明白，它其实是**三份独立文档被前后拼接**：
  1. `第 1–68 行`：开发工作流强制规则 + 4 道 Gate。
  2. `第 69–609 行`：另一份「CLAUDE.md — Koala PhD Project Context」——含**项目概述 / 技术栈 / 环境变量 / 文件结构（259 行起，长达 140 行）/ API 接口规范 / Semantic Scholar 规范 / pgvector 函数 / 品牌常量 / 常见错误 / 开发顺序**。
  3. `第 610–734 行`：又一份「CLAUDE.md — 项目开发规则」——铁律 / 开发流程 / 项目信息 / 禁止事项 / OpenSpec / Sentry / 硬规则。
- 问题点：
  - **规则重复且可能互相打架**：三份各有一套「禁止事项 / 开发流程 / 样式规则」，维护时容易只改一处。
  - **大量内容根本不该放在 CLAUDE.md**：API 接口规范应在 `docs/specs/`；文件结构应在 `ARCHITECTURE-ANALYSIS.md`；品牌常量已经在 `app/lib/constants.ts`（文档里那份还过期了，写的是 `koalastudy.net` 而代码是 `koalaphd.com`）；Semantic Scholar / pgvector 属于具体模块文档。
  - **文档与现实背离**（同问题 2）：内嵌的「文件结构」通篇用 `src/`，但仓库没有 `src/`。
- 正确做法：CLAUDE.md 只留「**强制规则 / Gate / 铁律 / 红线**」这类每次必读的短内容，其余按逻辑拆到对应 md，再用 `@相对路径` 引用（项目已在用 `@AGENTS.md` 这种 import 机制，可直接复用）。

#### 问题 13：绝对路径 / 硬编码地址 —— 迁移时会成片报错
- **致命**：`scripts/generate-ai-summaries.ts`、`scripts/backfill-semantic-scholar.ts` 硬编码 `'/Users/jhe/Desktop/koala-marketing-manager/.env.local'`。注意是 `jhe`，不是当前机器用户，**这两个脚本现在已经跑不了了**——正是「绝对路径害人」的活样本。
- **域名硬编码 68 个文件**：`koalaphd.com` / `koalastudy.net` 散落在 `robots.ts`、`sitemap.ts`、`layout.tsx`、poster、prompts、email 模板、service 各处；且存在三套并行写法——① `app/lib/constants.ts` 的 `BRAND.domain`、② `process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com'` 这串兜底被复制粘贴进至少 5 个文件、③ 直接写裸字面量。**没有单一可信源**，换域名/多环境时要全局搜替、极易漏。
- **`localhost:3000` 硬编码 10 个文件**：除 eval 外，`api/admin/trigger-sync`、`api/blog/regenerate-all-covers`、`api/blog/generate-professor` 这 3 个**生产 route** 也写死了 localhost，部署后会指向错误地址。
- 后果：换机器、换域名、加 staging 环境、迁仓库时，需要人肉全局排查；`/Users/jhe` 那条已经证明这种隐患会真的爆。

---

## 2. 目标结构（建议形态，供讨论）

> 不是要求一次到位，而是给重构一个「北极星」。核心动作：**把领域逻辑从 `app/lib/` 抽出，按业务域聚合**。

```
src/
├── app/                      ← 只剩「路由 + UI 入口」
│   ├── (koala)/ (dashboard)/ ← 页面，page.tsx 尽量薄，逻辑下沉到 features
│   └── api/**/route.ts       ← 薄控制器：解析→校验→调 service→返回
├── features/                 ← ★新增：按业务域聚合（域内含 ui/service/types）
│   ├── professors/  { components/  service.ts  matching.ts  types.ts }
│   ├── outreach/    { components/  email-generator.ts  credits.ts  types.ts }
│   ├── ola/         { components/  matchmaking.ts  memory.ts  types.ts }
│   ├── sales/       { components/  attribution.ts  commission.ts  types.ts }
│   ├── surveys/  blog/  ai-chat/ ...
├── lib/                      ← ★真正的「跨域基础设施」（无业务语义）
│   ├── supabase/  anthropic.ts  openai/embedding.ts  ratelimit.ts  slack.ts
│   ├── auth/      （含 API 路由鉴权 guard）
│   └── http/      api-client.ts （前端统一数据层）
├── components/ui/            ← 纯通用 UI（button/input/metric-label…）
└── types/                    ← 全局/跨域类型 + database.types.ts
```

判定规则：
- **有业务语义** → `features/<域>/`
- **无业务语义、纯技术能力** → `lib/`
- **纯展示、域无关** → `components/ui/`
- **HTTP 入口、路由** → `app/`

---

## 3. To-Do（可勾选追踪）

> 顺序经过排序：先立约定与地基（低风险、高收益），再逐域搬迁，最后清卫生。
> 每条尽量「原子化」，符合 CLAUDE.md 的 Gate 2。建议每条单独 commit + `npm run build` 验证。

### 阶段 A — 立约定 + 低风险地基（先做，不动业务逻辑）

- [ ] **A1. 写《目录约定》文档**：在 `docs/` 落定「features / lib / components/ui / types」的判定规则，并**修正 CLAUDE.md 里失效的 `src/` 路径描述**（要么引入 src，要么改文档与现实一致）。
- [ ] **A2. 统一 Supabase 服务端 client**：把 14 个内联 `createClient(SERVICE_ROLE)` 全部替换为共享 `app/lib/supabase/server`。验证：`grep -r "SERVICE_ROLE_KEY" app/api` 只剩 0~1 处（即只在共享 client 内）。
- [ ] **A3. 抽 API 鉴权 guard**：新建 `lib/auth/requireRole()`（解析用户 + 校验 `user_roles`），替换 16 个 route 的内联鉴权。验证：admin/sales route 统一一行 `await requireRole(req, 'admin')`。
- [ ] **A4. 集中类型**：建 `types/`（或 `app/types`）作为单一出口；把 `database.types.ts` 移入；把 `/api/ai/chat` 等核心接口的 Request/Response 抽成共享类型。
- [ ] **A5. 根目录卫生**：删除空文件 `0：`、`koala-changes.patch`（已合入则删）；归档 `blog 设计/`、`todo list/`、`SITE_LOGIC.md` 到 `docs/archive/`；`mockData.ts` 重命名/归位。验证：`git status` 干净、根目录只剩配置与标准目录。
- [ ] **A6. 前端数据层骨架**：建 `lib/http/api-client.ts`（统一 baseURL/错误/JSON 解析），先在 1~2 个页面试点，不强制全量替换。
- [ ] **A7. 瘦身 + 拆分 `CLAUDE.md`（问题 12）**：CLAUDE.md 只保留「强制规则 / 4 道 Gate / 铁律 / 红线 / 硬规则」；其余按逻辑外置——API 接口规范 → `docs/specs/`、文件结构 → `ARCHITECTURE-ANALYSIS.md`、品牌常量 → 指向 `app/lib/constants.ts`（并删掉过期的 `koalastudy.net` 文案）、Semantic Scholar / pgvector → 各自模块文档；外置后用 `@相对路径` 引用（复用现有 `@AGENTS.md` 机制）。同时**合并三份拼接文档里重复/冲突的规则**。验证：CLAUDE.md < 200 行，无重复章节，引用链接可点开。
- [ ] **A8. 修复致命的脚本绝对路径（问题 13，最先做）**：`scripts/generate-ai-summaries.ts` 与 `scripts/backfill-semantic-scholar.ts` 的 `'/Users/jhe/...env.local'` 改为相对项目根（如 `path.resolve(process.cwd(), '.env.local')` 或标准 dotenv 加载）。验证：换任意机器 `npx tsx` 能跑通。
- [ ] **A9. 统一站点/基础 URL 单一来源（问题 13）**：建一个 `getBaseUrl()`（服务端读 `NEXT_PUBLIC_BASE_URL` / `VERCEL_URL`，开发回退 localhost），替换散落的 `... || 'https://koalaphd.com'` 兜底；域名常量统一收口到 `app/lib/constants.ts` 的 `BRAND`。验证：`grep -rn "koalaphd.com\|localhost:3000" app lib` 仅剩 constants/getBaseUrl 内的定义点。
- [ ] **A10. 修生产 route 里的 `localhost:3000`（问题 13）**：`api/admin/trigger-sync`、`api/blog/regenerate-all-covers`、`api/blog/generate-professor` 改用 A9 的 `getBaseUrl()`。验证：部署环境自调用指向正确域名。
- [ ] **A11. 加一道防回归闸**：在 `npm run build` 前置检查或 lint 里，禁止源码出现 `/Users/`、裸 `localhost:3000`、裸生产域名字面量（eval/test 可白名单）。验证：故意引入一条会被拦下。

### 阶段 B — 拆 God 文件（不改业务、只拆分，降冲突风险）

- [ ] **B1. 拆 `api/ai/chat/route.ts`（1917 行）**：把「Prompt 拼装 / RAG 编排 / 后处理」下沉到 `features/ai-chat/` 的 service，route 变薄控制器。验证：route.ts < 200 行，build 通过，对话功能手测正常。
- [ ] **B2. 拆 `koala/chat/page.tsx`（2791 行）**：按「消息流 / 输入区 / 模式切换 / 内嵌产物卡」拆成子组件 + 自定义 hook。
- [ ] **B3. 拆 `my-profile/page.tsx`（2053 行）**。
- [ ] **B4. 拆 `dashboard/koala/blog/page.tsx`（1448）+ `blog/edit/page.tsx`（1334）**：共用逻辑提到 `features/blog/`。
- [ ] **B5. 拆 `professors/ProfessorsClient.tsx`（1304）+ `banners/page.tsx`（1151）**。
- [ ] **B6. 制定「单文件行数红线」**（建议 page/route ≤ 400，组件 ≤ 300），加入 review checklist 或 lint 提示。

### 阶段 C — 按业务域搬迁（每个域独立 PR，可并行分配）

> 每个域：把散落在 `api / lib/server / lib/services / koala-components / dashboard` 的代码聚到 `features/<域>/`。route 只保留 HTTP 壳。建议从依赖最少、边界最清的域开始。

- [ ] **C1. `features/professors/`**：matching-engine + professorService + 教授组件 + 相关 API 逻辑。
- [ ] **C2. `features/outreach/`**：email-generator + credits + 套磁信组件 + outreach API 逻辑。
- [ ] **C3. `features/sales/`**：attribution + commission + sales 后台组件 + sales API 逻辑（注意 middleware 归因联动）。
- [ ] **C4. `features/ola/`**：ola/* + olaMatchmaking/Memory/Reflection service + ola 组件 + ola API。
- [ ] **C5. `features/surveys/`**：surveyService（1229 行，需顺带拆分）+ 问卷组件 + surveys API。
- [ ] **C6. `features/blog/`**：blog 生成全流程 service + 组件 + blog API。
- [ ] **C7. `features/ai-chat/`**：prompts/* + rag-engine + adaptive-tone + chat 组件（承接 B1/B2）。
- [ ] **C8. 收尾 `app/lib/`**：搬迁后只剩纯基础设施（supabase/anthropic/embedding/ratelimit/slack…）下沉到 `lib/`；删空目录。验证：`app/lib/server` 与 `app/lib/services` 清空或仅余基础设施。

### 阶段 D — 组件与最终收口

- [ ] **D1. 统一组件分层**：纯通用 UI → `components/ui/`；域内组件 → `features/<域>/components/`。消除根 `components/` 与 `app/components/` 的重叠。
- [ ] **D2. 前端数据层全量化**：把 121 个裸 `fetch('/api/...')` 逐步迁到 `api-client` / 域内 hooks（可随 C 阶段分域进行）。
- [ ] **D3. 为抽离后的纯逻辑补单元测试**（matching、commission、credits、sensitive-filter 等现在已可独立测试）。
- [ ] **D4. 更新 ARCHITECTURE-ANALYSIS.md** 为重构后的新结构；本文勾选完毕后归档。

---

## 4. 风险与原则

1. **不要一次大爆炸重构**：按域、按文件、原子化推进，每步 `npm run build` + 手测（CLAUDE.md 硬规则：push 前 build 必过）。
2. **搬迁优先用「移动 + 改 import」**，先不改逻辑；拆分（B 阶段）与搬迁（C 阶段）分开做，便于 review 与回滚。
3. **`@/` 别名已配置**（`tsconfig` paths `@/* → ./*`），搬迁后 import 路径可平滑切换。
4. **安全红线不变**：`lib/server`（持 secret）绝不能被 client import；搬到 `features` 后需保持「server-only」约束（可加 `import 'server-only'`）。
5. **每完成一个阶段**，回填本文勾选状态 + commit hash，保证可追踪。
