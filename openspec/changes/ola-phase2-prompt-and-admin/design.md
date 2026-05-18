## Context

Ola AI 对话走 `POST /api/ai/chat`，当前通过 `buildSystemPrompt(mode, extraContext)` 组装 prompt。Phase 2 Part A 已加入 FAQ 匹配层（matchFAQ 在 LLM 前拦截）、session 追踪（upsertSession）、事件记录（recordEvent）。但 system prompt 仍是通用的，没有 Ola 学姐人设；没有情绪检测；没有漏斗阶段追踪。

Admin 侧边栏已有知识库管理，需新增 FAQ 管理入口。

## Goals / Non-Goals

**Goals:**
- Ola 人设 prompt 完整实现（学姐角色、语言规则、引导规则、竞品话术）
- 情绪检测注入 prompt（焦虑/沮丧两种状态）
- 对话漏斗 stage 标记解析 + session 更新
- Prompt 组装顺序标准化
- Admin FAQ 管理页面（CRUD + 测试面板）

**Non-Goals:**
- 不做多轮情绪趋势分析（Phase 3）
- 不做 FAQ 自动学习/推荐（Phase 3）
- 不做 Admin FAQ 数据统计/命中率面板

## Decisions

### 1. Ola 人设 prompt 作为独立函数

创建 `app/lib/prompts/ola-persona.ts` 导出 `getOlaPersonaPrompt()` 返回完整人设 prompt。在 chat route 中，当 mode 为 Ola 相关时替换通用 system prompt。

替代方案：直接硬编码在 chat route 中 — 太长，不好维护。

### 2. 情绪检测用纯关键词，不用 LLM

与 FAQ 引擎同理：情绪检测是确定性逻辑，用关键词匹配即可，零 API 成本。中英文关键词列表覆盖常见表达。

### 3. 漏斗阶段用 `<stage>` 标记而非 JSON

让 Claude 在回复末尾附加 `<stage>N</stage>`，后端正则提取后从回复中移除。比 JSON 块更轻量，不影响 Claude 的自然语言输出。

### 4. Prompt 组装顺序固定

```
1. Ola 人设 prompt（基础角色设定）
2. 情绪检测结果（如有）
3. 用户上下文（学生画像、教授信息）
4. RAG 知识库内容
5. 漏斗阶段追踪指令
6. 教授推荐规则（如适用）
```

消息列表（对话历史 + 最新消息）作为 messages 数组单独传。

### 5. FAQ 管理页面复用知识库页面模式

与 `knowledge-base/page.tsx` 相同的 CRUD 模式：列表 + 创建/编辑 modal + 删除确认 + 测试面板。

## Risks / Trade-offs

- **[Risk] 人设 prompt 过长增加 token 消耗** → 约 500 字，ephemeral cache 可缓解
- **[Risk] 情绪误检测** → 关键词列表保守，宁可漏检不误检
- **[Risk] Stage 标记 Claude 可能忘记输出** → 在 prompt 中明确要求，后端默认 stage 不变
