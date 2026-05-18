## Context

`knowledge_chunks` 表和 `match_knowledge()` RPC 函数已存在于 Supabase 中。`rag-engine.ts` 和 `embedding.ts` 提供完整的读取链路，`ai/chat` 路由已集成 RAG 检索。现有的两个 seed 脚本（`seed-knowledge-base.ts`、`build-knowledge.ts`）是唯一的数据写入方式，Admin 后台知识库页面只有只读展示和搜索测试功能。

现有 `knowledge_chunks` 表的 `source_type` 有 CHECK 约束，仅允许：`professor_paper`、`arc_grant`、`blog_post`、`faq`、`user_feedback`。手动添加的知识条目需要扩展此约束，增加 `guide`（已被 seed 脚本使用但不在 CHECK 中）和 `manual` 类型。

## Goals / Non-Goals

**Goals:**
- Admin 可在后台对 `knowledge_chunks` 表进行完整 CRUD 操作
- 创建/更新条目时自动调用 OpenAI embedding API 生成向量
- 提供独立的语义搜索测试 API，返回匹配结果和相似度分数
- 支持 JSON 格式批量导入
- 复用现有 `embedding.ts`、`supabaseAdmin`、`requireAdmin` 等基础设施

**Non-Goals:**
- 不改动现有 RAG 读取链路（`rag-engine.ts`、`ai/chat`）
- 不做文档上传解析（PDF/Word → chunk 拆分），留给后续迭代
- 不做知识条目版本管理
- 不做使用频次追踪或 chunk 质量分析

## Decisions

### 1. 使用现有 `knowledge_chunks` 表，不新建表

用户原始提案建议新建 `knowledge_base` 表。但 `knowledge_chunks` 已有完整索引、RPC 函数和 RAG 集成，新建表会导致两套体系共存。扩展现有表的 CHECK 约束即可。

替代方案：新建 `knowledge_base` 表 + 双写 — 增加复杂度且 rag-engine 需要改动，不值得。

### 2. API 路径放在 `app/api/admin/knowledge/`

与现有 `app/api/admin/knowledge-stats/route.ts` 风格一致。所有接口使用 `requireAdmin()` 鉴权。

路由结构：
- `GET /api/admin/knowledge` — 分页列表（支持 source_type 筛选、关键字搜索）
- `POST /api/admin/knowledge` — 创建（自动生成 embedding）
- `GET /api/admin/knowledge/[id]` — 单条详情
- `PUT /api/admin/knowledge/[id]` — 更新（内容变化时重新生成 embedding）
- `DELETE /api/admin/knowledge/[id]` — 删除
- `POST /api/admin/knowledge/search` — 语义搜索测试
- `POST /api/admin/knowledge/batch` — 批量导入

### 3. Embedding 生成策略

创建和更新时同步生成 embedding，不使用队列。原因：单条 embedding 调用 < 500ms，Admin 操作频率低，同步足够。批量导入时使用 `createEmbeddingsBatch()` 减少 API 调用次数。

替代方案：异步队列 — 对 Admin 手动操作场景过于复杂。

### 4. 扩展 source_type CHECK 约束

在 `knowledge_chunks` 表上 ALTER CHECK 约束，增加 `guide` 和 `manual` 两个类型。`guide` 是 seed 脚本已在使用的类型，`manual` 是 Admin 手动创建时的默认类型。

### 5. 前端改造现有页面而非新建

`app/dashboard/koala/knowledge-base/page.tsx` 已有基础 UI 框架（统计卡片、搜索测试、内容列表），在此基础上增加 CRUD 功能，避免页面分裂。

## Risks / Trade-offs

- **[Risk] OpenAI embedding API 调用失败** → 创建/更新时 catch 错误，返回 500 并提示 Admin 重试。不存储没有 embedding 的条目（否则 RAG 搜不到）。
- **[Risk] 批量导入时 embedding API 限速** → 使用 batch API 减少调用次数，每批最多 20 条。前端显示导入进度。
- **[Risk] 修改 CHECK 约束需要 Supabase SQL Editor** → 提供 migration SQL，Admin 手动执行或通过 Supabase MCP 执行。
- **[Trade-off] 同步 embedding vs 异步** → 选择同步，牺牲批量导入速度换取实现简单。单条 < 1s，批量 20 条 < 3s，可接受。
