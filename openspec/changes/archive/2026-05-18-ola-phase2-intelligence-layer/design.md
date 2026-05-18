## Context

Ola AI 当前架构：用户消息 → `POST /api/ai/chat` → intent 检测 → RAG 检索 → Claude API → 响应。每条消息都走 Claude，无论是"怎么充值"还是真正的学术问题。Phase 1 只有 UI 组件（OlaAvatar/Widget/Loading/Empty），无独立智能层。

现有 `ai_conversations` 表存储对话历史但无结构化 session 追踪。

## Goals / Non-Goals

**Goals:**
- FAQ 匹配拦截高频问题，降低 LLM 调用成本
- Session 级别的状态追踪（活跃/完成/沉默）
- 对话漏斗事件记录（用于分析转化路径）
- 所有新增模块放在 `app/lib/ola/` 目录，与现有 RAG/chat 代码隔离

**Non-Goals:**
- 不做情绪检测（留给 Phase 3）
- 不修改 Ola 人设 prompt（留给 Phase 3）
- 不做 FAQ 管理 Admin UI（用通用 CRUD 接口，Admin 页面后续做）
- 不做多语言自动切换（FAQ 答案有中英双语，前端根据用户偏好选择，但不做自动检测）

## Decisions

### 1. FAQ 匹配引擎用纯关键词评分，不用 embedding

理由：FAQ 是固定答案的精确匹配场景，不需要语义搜索。关键词匹配 + 同义词表即可覆盖，零 API 调用成本。

替代方案：用 pgvector 做 FAQ 语义搜索 — 每次还是要调 OpenAI embedding，违反"零 LLM 成本"目标。

### 2. FAQ 匹配阈值策略

匹配分 = 匹配到的关键词数 / FAQ 条目关键词总数。阈值 0.5（至少一半关键词命中）。多个 FAQ 命中时取分数最高的。如果最高分 < 0.5，返回 null 转给 LLM。

### 3. Session 表与 ai_conversations 分离

`ola_sessions` 是聚合层（一个 session 多条消息），`ai_conversations` 是消息层。session 表记录状态和统计，不重复存储消息内容。

### 4. 事件表用 append-only 模式

`ola_conversation_events` 只插入不更新，时间序列数据。查询用 session_id 和 event_type 筛选。

### 5. FAQ 集成点：在 intent 检测之前

```
用户消息 → FAQ 匹配 → 命中? → 返回 FAQ 答案（记录 faq_hit 事件）
                     → 未命中 → intent 检测 → RAG → LLM（记录 llm_call 事件）
```

## Risks / Trade-offs

- **[Risk] FAQ 误匹配** → 阈值 0.5 + priority 字段可以手动调优，Admin 可禁用单条 FAQ
- **[Risk] 同义词表不全** → 初始覆盖常见变体，后续根据 llm_call 事件中的未匹配消息补充
- **[Trade-off] 关键词 vs 语义** → 选择关键词牺牲了模糊匹配能力，但换来零成本。真正需要理解的问题交给 LLM
