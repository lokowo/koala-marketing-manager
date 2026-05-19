## Context

Ola Phase 2 已部署：ola_sessions, ola_triggers, ola_trigger_logs, ola_faq 表已存在于 Supabase。`ola_events` 和 `knowledge_miss_log` 表不存在——分析面板需要从现有表聚合，缺少的表需要创建或用替代方案。Admin 侧边栏已有"Ola 触发"入口。Resend 通过 `app/lib/email/resend.ts` 的 `getResend()` 单例使用。

## Goals / Non-Goals

**Goals:**
- Admin 可看到 Ola 全景运营数据（一个页面，多个 tab）
- 自动化用户再激活（邮件），减少人工干预
- 截止日信息自动注入 AI 对话，提升实用性
- 全部用 CSS 实现图表，不引入图表库

**Non-Goals:**
- 不做实时 WebSocket 推送（页面刷新即可）
- 不做邮件 A/B 测试
- 不配置 Vercel Cron（只创建 API endpoint）
- 不修改 Ola 对话核心逻辑（只在 system prompt 中注入截止日上下文）

## Decisions

### 1. ola_events 表：不创建，用现有数据

现有代码中没有 `ola_events` 表。Tool 使用统计改为从 `ola_sessions` 的 metadata/messages 或 AI chat API 的日志中推断。如果不可行，先在分析面板中显示"暂无数据"并标注需要埋点。

**替代方案**: 创建 ola_events 表并在所有 tool 调用处埋点——工作量大，留到后续迭代。

### 2. knowledge_miss_log 表：不创建

知识盲区统计依赖 RAG 引擎记录 miss 事件。当前 RAG 引擎没有这个功能。分析面板中此区域显示"功能开发中"占位。

### 3. 分析面板 API：单一聚合端点

`GET /api/admin/ola-analytics?section=kpi|funnel|ratings|tools|triggers`

每个 section 独立查询，前端按需请求。这样避免一次查询过重。

### 4. 邮件模板：数据库存储 + seed

模板存在 `ola_email_templates` 表中，通过 seed API 初始化。Admin 可启用/禁用但不可编辑模板内容（V1 简化）。

### 5. 截止日 prompt 注入：在 AI chat API 中

在 `/api/ai/chat/route.ts`（或 Ola 的对话 API）的 system prompt 构建阶段，查询用户目标大学的截止日，追加到 prompt 末尾。查询使用 Supabase 直接 select，无需新的 server lib。

### 6. 分析页面结构：3 个 Tab

- Tab 1: 概览（KPI + 漏斗 + 评分）
- Tab 2: 详情（Tool 统计 + 触发效果 + 盲区占位）
- Tab 3: 再激活邮件（模板管理 + 统计）

## Risks / Trade-offs

- **[ola_events 不存在]** → Tool 使用统计无真实数据。缓解：显示占位提示，后续迭代补埋点。
- **[knowledge_miss_log 不存在]** → 知识盲区无法统计。缓解：显示"功能开发中"。
- **[邮件频率控制]** → 每天每用户最多 1 封 + 每模板 30 天冷却。防止骚扰。
- **[截止日数据准确性]** → 大学截止日每年变化。缓解：Admin 可手动更新 + 数据标注年份。
