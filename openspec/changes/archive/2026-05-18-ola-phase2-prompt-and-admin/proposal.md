## Why

Ola AI Phase 2 Part A 只完成了 FAQ 引擎和 session/event 基础设施，但缺少人设 prompt 升级、情绪检测、对话漏斗追踪和 Admin FAQ 管理 UI。用户与 Ola 对话时仍在用通用 prompt，没有学姐人设；无法根据用户情绪调整语气；Admin 无法管理 FAQ 条目。

## What Changes

- 替换 Ola AI 的 system prompt 为完整学姐人设（语言规则、回复规则、引导规则、竞品话术）
- 新增情绪检测模块 `lib/ola/ola-emotion.ts`，检测焦虑/沮丧并注入 prompt
- 新增对话漏斗阶段追踪（`<stage>N</stage>` 标记解析 + session 更新）
- 规范 prompt 组装顺序：人设 → 情绪 → 用户上下文 → RAG → 对话历史 → 用户消息
- 新增 Admin FAQ 管理页面（CRUD + 启用/禁用 + 测试面板）
- Admin 侧边栏添加 FAQ 管理入口

## Capabilities

### New Capabilities
- `ola-persona-prompt`: Ola 学姐人设 system prompt + 语言/回复/引导/竞品规则
- `ola-emotion-detection`: 情绪检测模块 + chat route 集成
- `ola-funnel-tracking`: 对话漏斗阶段追踪（stage 标记解析 + session 更新）
- `admin-faq-management`: FAQ 管理 Admin 页面（CRUD + 测试面板）

### Modified Capabilities
<!-- None — all changes are additive -->

## Impact

- `app/api/ai/chat/route.ts` — prompt 组装逻辑重构 + 情绪检测 + stage 解析
- `app/lib/ola/` — 新增 ola-emotion.ts
- `app/lib/prompts/` — 可能新增或修改 Ola 专用 prompt
- `app/dashboard/koala/` — 新增 FAQ 管理页面
- `app/dashboard/koala/layout.tsx` — 侧边栏新增入口
