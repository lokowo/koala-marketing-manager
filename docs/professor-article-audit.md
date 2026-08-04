# 教授介绍文章生成链路 — 只读审计报告

> 日期：2026-08-04 · 类型：只读调研（未改任何业务代码）
> 目的：查清教授介绍文章的生成与存储现状，供后续设计去重闸门。

---

## 摘要（TL;DR）

- **存在两条生成入口**，最终都落到同一个核心 API `POST /api/blog/generate-professor`。
- 写入表为 **`blog_posts`**，`category = 'professor_spotlight'`，通过 **`professor_id` (uuid, 可空)** 关联教授。
- **`professor_id` 上没有唯一约束**（全表唯一索引只有 `id` 和 `slug`）。数据库层面完全不阻止同一教授生成多篇。
- **只有 C 端入口有一层弱查重**（仅查 `status='published'` 的存量文章）；**Admin 入口和核心生成 API 均无任何查重**。
- 积分扣除发生在**生成之前**（在 C 端包装层扣，首篇免费，之后 10 积分）。Admin 入口不扣积分。
- 现状：`professor_spotlight` 共 **36 篇**，其中 35 篇带 `professor_id`、1 篇为空；全部 published。存在 **1 个重复 professor_id**（Bryan Boruff，2 篇）。

---

## 1. 链路定位

### 入口 A — 后台管理端（Admin）
- **前端组件**：`app/dashboard/koala/blog/page.tsx`
  - 弹窗标题「🎓 生成教授推荐文章」（`:563`）
  - `generateArticle()` → `fetch('/api/blog/generate-professor')`（`:539`）
- **调用 API**：`POST /api/blog/generate-professor`（**直连核心生成 API**）
- **特点**：直接携带 `professorId` 调用核心生成，**不扣积分、不查重**。

### 入口 B — C 端教授详情页（用户）
- **前端组件**：`app/koala/professors/[id]/ProfessorDetailClient.tsx`
  - 按钮文案「生成教授介绍文章（首次免费 / 10 积分）」（`:464`）
  - `handleGenerateBlog()` → `fetch('/api/professors/${professor.id}/generate-blog')`（`:131`）
- **调用 API**：`POST /api/professors/[id]/generate-blog`
  - 文件：`app/api/professors/[id]/generate-blog/route.ts`
  - 该 route 负责：**查重 → 限流 → 扣积分**，然后通过 server-to-server 内部鉴权转发到核心生成 API：
    `fetch('/api/blog/generate-professor', headers: x-internal-secret + x-internal-user-id)`（`route.ts:106`）
  - 生成成功后**自动 publish**（`status='published'`, `published_at=now()`）（`:127-134`）

### 核心生成 API（两条入口的汇合点）
- **文件**：`app/api/blog/generate-professor/route.ts`
- **LLM 封装**：**未使用共享 lib 封装**，直接 `new Anthropic({ apiKey })`（`@anthropic-ai/sdk`）在 route 内多次调用：
  | 步骤 | 模型 | 用途 |
  |---|---|---|
  | 身份验证 | `claude-sonnet-4-6` + `web_search_20250305` 工具 | 核对教授身份/机构变更 |
  | 中文正文 | `claude-sonnet-4-6` | 生成 800–1200 字中文文章 |
  | JSON 修复 | `claude-haiku-4-5-20251001` | 正文 JSON 解析失败时兜底 |
  | 英文翻译 | `claude-haiku-4-5-20251001` | 翻译标题/摘要/正文 |
  | SEO | `claude-haiku-4-5-20251001` | 生成中文 SEO 元数据 |

内部鉴权约定：`x-internal-secret === SUPABASE_SERVICE_ROLE_KEY.slice(0,32)` 且带 `x-internal-user-id` 视为内部调用（`route.ts:46-59`）。

---

## 2. 表结构

### 写入表：`blog_posts`（生产库实测 schema）

关键列：

| 列 | 类型 | 可空 | 默认 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | 主键 |
| `slug` | text | YES | — | **唯一**（`blog_posts_slug_key`） |
| `professor_id` | **uuid** | **YES** | null | 关联教授，**无唯一约束、无外键索引** |
| `category` | text | YES | — | 教授文章固定为 `'professor_spotlight'` |
| `title_zh` / `title_en` | text | YES | — | 标题 |
| `excerpt_zh` / `excerpt_en` | text | YES | — | 摘要 |
| `content_zh` / `content_en` | text | YES | — | 正文 |
| `tags` | text[] | YES | `'{}'` | 标签 |
| `status` | text | NO | `'draft'` | draft/published/scheduled |
| `cover_image_url` | text | YES | null | 封面 |
| `cover_image_status` | text | NO | `'none'` | pending/generating/none |
| `seo_title_zh` / `seo_description_zh` / `seo_keywords_zh` | text | YES | — | SEO |
| `reading_time_zh` / `reading_time_en` | integer | YES | — | 阅读时长 |
| `view_count` / `share_count` | integer | YES | 0 | 统计 |
| `published_at` / `created_at` / `updated_at` | timestamptz | — | — | 时间戳 |

> 注：仓库里的 `supabase/blog-tables.sql`、`supabase/blog_tables.sql` 均为**旧版建表脚本，不含 `professor_id`**。生产库以上述实测为准；`professor_id` 系后续 migration 追加。

### 索引 / 唯一约束（生产库实测）

```
blog_posts_pkey        UNIQUE (id)
blog_posts_slug_key    UNIQUE (slug)
idx_blog_posts_status  (status)
idx_blog_posts_category(category)
idx_blog_posts_pinned  (is_pinned)
idx_blog_posts_published(published_at DESC)
```

**结论：`professor_id` 既无唯一索引，也无普通索引。数据库层零去重能力。**

### 教授表：`professors`

- **主键字段名**：`id` (uuid)
- **研究方向标签字段名**：`research_areas` (text[])
  - 代码兜底还会读 `research_tags`（`generate-professor/route.ts:84`），但**生产库 `professors` 表无 `research_tags` 列**，实际生效的是 `research_areas`。
- 其他相关：`name` / `position_title` / `title` / `university`。

---

## 3. 生成逻辑

### 3.1 查重 / 已存在检查

| 位置 | 是否查重 | 逻辑 |
|---|---|---|
| 核心 API `generate-professor` | **无** | 直接生成并 `insert` 新行，不检查该 `professor_id` 是否已有文章 |
| Admin 入口 `blog/page.tsx` | **无** | 直连核心 API |
| C 端包装 `[id]/generate-blog` | **有（弱）** | `blog_posts` 查 `professor_id=id AND status='published'`，`maybeSingle()`；命中则返回 `{exists:true}` 不再生成（`route.ts:20-31`） |

C 端弱查重的**盲区**：
- 只匹配 `status='published'`，**draft/scheduled 状态的存量文章不算数** → 会重复生成。
- Admin 入口**完全绕过**该检查。
- 无唯一约束兜底 → 两条链路/并发请求都可能写入重复行（现存的 Bryan Boruff 即为例证）。

### 3.2 Prompt 喂给模型的字段清单（中文正文 Prompt，`route.ts:295-341`）

来自 `professors` 表：
1. `name`（回退 `name_en`）→ Name
2. `university`（回退 `institution`；可能被身份验证步骤改写为核实后的当前机构）
3. `faculty` → 拼在 University 后
4. `position_title`（回退 `title`，默认 `'Researcher'`）→ Position
5. `research_areas`（回退 `research_tags`，join 逗号）→ Research Areas
6. `h_index` → H-Index
7. `paper_count`（回退 papers 数量）→ Papers
8. `citation_count` → Citations
9. `accepting_students` → Accepting Students
10. `suitable_student_backgrounds` (数组) → Suitable Backgrounds
11. `potential_rp_topics` (数组) → Potential RP Topics

来自 `papers` 表（按 citation_count 降序取前 10）：
12. `title` / `journal` / `year` / `citation_count`（顶刊标 ⭐）

来自 `grants` 表（`lead_professor_id` 关联，按 year 降序）：
13. `grant_name` / `funding_body` / `year` / `amount` / `project_title` / `phd_relevance`

身份验证步骤产出的：
14. `verifiedProfileUrl`（官方主页）
15. `verifiedGoogleScholarUrl`（Google Scholar）
16. 生成日期（用于「数据更新时间」与末尾来源块）

### 3.3 积分扣除时机

- **发生在生成之前**，且仅在 C 端包装层 `[id]/generate-blog/route.ts`：
  1. 查是否已有 published 文章 → 有则直接返回，不扣分（`:20-31`）
  2. 查该用户是否**首次**生成（`credit_transactions` 里 `type='spend_blog_generation'` 计数为 0）→ 首次**免费**，仅记一条 amount=0 流水（`:85-99`）
  3. 非首次：`plan_type='elite'` 免费（记 amount=0 流水）；否则校验余额 ≥ 10，`credits_remaining -= 10` 并写 amount=-10 流水（`:42-84`）
  4. **扣分/记账完成后**才转发核心生成 API（`:106`）
- **Admin 入口不涉及积分**（直连核心 API，核心 API 本身不碰积分）。
- 风险：先扣分后生成，若核心 API 失败，包装层返回错误但**积分已扣、无回滚逻辑**。

---

## 4. 现状统计（生产库实测）

### 4.1 教授介绍文章总数

| 指标 | 值 |
|---|---|
| `category='professor_spotlight'` 总数 | **36** |
| 其中带 `professor_id` | 35 |
| `professor_id` 为空 | 1 |
| `status='published'` | 36（全部已发布） |

### 4.2 按 `professor_id` 分组 count>1

- **重复的 professor_id 数量：1 个**

示例（唯一一组重复）：

| professor | 篇数 | slug / 标题 | 状态 | 创建时间 |
|---|---|---|---|---|
| Bryan Boruff (`03d41e53…`) | 2 | `bryan-boruff-exploring-how-urban-environments-…-1779414062150`<br>「Bryan Boruff：用地理与健康的交叉视角，探索城市环境如何塑造人类福祉」 | published | 2026-05-22 |
| | | `bryan-boruff-exploring-urban-health-…-1779756564846`<br>「Bryan Boruff：用地理与环境数据探索城市健康，UWA 研究城市绿地与可达性的领军学者」 | published | 2026-05-26 |

> 两篇均 published、`slug` 因带 `Date.now()` 后缀而不同，因此 `slug` 唯一约束无法拦截重复；C 端弱查重理论上应拦第二篇，说明第二篇很可能经 **Admin 入口**（无查重）生成。

### 4.3 是否进入博客列表（教授推荐分类）

**是。** `professor_spotlight` 是博客列表的正式分类：
- C 端博客列表 `app/koala/blog/page.tsx:36` 的分类 tab「教授推荐」；`getSourceLabel()` 归为「教授推荐」。
- 列表数据经 `GET /api/blog`（`app/api/blog/route.ts`），支持 `?category=professor_spotlight` 过滤，默认只返回 published。
- 首页 `app/koala/home/*`、后台 `app/dashboard/koala/blog/page.tsx` 均将 `professor_spotlight` 映射为「教授推荐」。
- C 端生成成功后还会即时插入教授详情页的「相关文章」列表（`ProfessorDetailClient.tsx:145`）。

---

## 附：去重闸门设计的可落点（供后续参考，非本次改动）

1. **DB 层**：对 `blog_posts(professor_id) WHERE category='professor_spotlight'` 加**部分唯一索引**（需先清理现存 1 组重复）。
2. **核心 API 层**：`generate-professor` 在 `insert` 前统一查 `professor_id` 是否已有文章（覆盖 Admin + C 端两条入口，不限 status）。
3. **弱查重收口**：把 C 端 `[id]/generate-blog` 的「仅查 published」放宽为「查任意 status」，并把查重前移逻辑复用到核心 API，避免 Admin 绕过。
4. **积分回滚**：若下沉查重到核心 API 之后仍先扣分，需为生成失败补回滚。
