## Why

Ola Phase 2 已上线（触发引擎、评分、FAQ、Handoff），但 Admin 无法看到 Ola 的运营数据（对话量、评分、漏斗、盲区），无法做数据驱动优化。同时用户流失缺乏自动再激活机制，申请截止日信息未集成到 AI 对话中。Phase 3 补齐这三块。

## What Changes

**Feature 1: Admin Ola 分析面板**
- 新增 `/dashboard/koala/ola-analytics` 页面，含 4 个 KPI 卡片、对话漏斗图、评分分布、Tool 使用统计、知识盲区 Top 10、触发规则效果
- 新增 `/api/admin/ola-analytics` API 聚合查询
- Admin 侧边栏添加"Ola 分析"入口

**Feature 2: 智能再激活邮件**
- 新增 `ola_email_templates` + `ola_email_logs` 表
- Seed 5 个邮件模板（inactive_3d, letter_unsent_7d, deadline_30d, deadline_7d, dormant_30d）
- 新增 `/api/ola/send-reengagement` 邮件发送 API（用 Resend）
- 新增 `/api/cron/ola-reengagement` 定时检查 + 发送
- Admin 邮件管理 tab（启用/禁用、统计、手动触发）

**Feature 3: 申请截止日感知**
- 新增 `university_deadlines` 表 + Go8 2026-2027 seed 数据
- 截止日注入 Ola system prompt（用户目标大学 → 倒计时提醒）
- 新增 2 条截止日触发规则（30d + 7d）
- Admin 截止日 CRUD 管理页面

## Capabilities

### New Capabilities
- `ola-analytics-dashboard`: Admin 分析面板（KPI、漏斗、评分、Tool 统计、盲区、触发效果）
- `ola-reengagement-email`: 智能再激活邮件系统（模板、发送、定时、管理）
- `university-deadline-awareness`: 申请截止日感知（数据表、prompt 注入、触发规则、管理）

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

**新增数据库表**: `ola_email_templates`, `ola_email_logs`, `university_deadlines`
**新增页面**: `/dashboard/koala/ola-analytics`
**新增 API**: `/api/admin/ola-analytics`, `/api/ola/send-reengagement`, `/api/cron/ola-reengagement`, `/api/admin/university-deadlines`
**修改文件**: Admin layout.tsx（侧边栏）, Ola chat API（deadline prompt 注入）
**依赖**: Resend（已有）, Supabase（已有）
