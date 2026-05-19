## Why

Ola AI Phase 1 只完成了 UI 组件层（OlaAvatar/Widget/Loading/Empty），所有对话仍走通用的 `/api/ai/chat` 路由直接调 Claude。每条消息都消耗 LLM token，高频重复问题（价格、积分、怎么用）无法被拦截。没有 FAQ 层、没有 session 持久化、没有对话漏斗追踪。

Phase 2 的目标是在 LLM 前面加一层零成本的 FAQ 关键词匹配引擎，命中常见问题直接返回答案，未命中才转给 RAG + LLM。同时建立 session 持久化和对话漏斗追踪基础。

## What Changes

### Part 1: FAQ 关键词检索层
- 创建 `ola_faq` 表存储 FAQ 条目（category + keywords + 中英文答案 + 可选富卡片）
- 创建 `app/lib/ola/ola-faq.ts` — FAQ 匹配引擎（分词 + 同义词扩展 + 关键词打分）
- 插入 15 条初始 FAQ 数据
- 集成到 `/api/ai/chat` — 在调 LLM 之前先过 FAQ 匹配

### Part 2: Session 持久化
- 创建 `ola_sessions` 表追踪用户会话（session_id, user_id, 消息数, 模式, 状态）
- 在 chat API 中自动创建/更新 session 记录

### Part 3: 对话漏斗追踪
- 创建 `ola_conversation_events` 表记录关键事件（session_start, faq_hit, llm_call, professor_match, credit_action 等）
- 在各触发点埋入事件记录

## Capabilities

### New Capabilities
- `ola-faq`: FAQ 关键词匹配引擎 + 数据表 + 初始数据 + AI 对话集成
- `ola-session-tracking`: Session 持久化 + 对话漏斗事件追踪

### Modified Capabilities

## Impact

- **新增表**: `ola_faq`, `ola_sessions`, `ola_conversation_events`
- **新增文件**: `app/lib/ola/ola-faq.ts`, `app/lib/ola/ola-session.ts`, `app/lib/ola/ola-events.ts`
- **修改**: `app/api/ai/chat/route.ts` — 在 LLM 调用前加 FAQ 匹配层，添加 session/event 追踪
- **新增 API**: `app/api/admin/ola-faq/route.ts` — FAQ CRUD（Admin 管理）
- **依赖**: 无新依赖
