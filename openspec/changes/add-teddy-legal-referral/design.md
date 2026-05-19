## Context

Ola 的 system prompt 由 `app/lib/prompts/ola-persona.ts` 的 `getOlaPersonaPrompt()` 生成，在 `app/api/ai/chat/route.ts` 中作为 base prompt 使用。需要在 persona prompt 末尾追加一段法律推荐规则文本，不改动其他逻辑。

## Goals / Non-Goals

**Goals:**
- 当用户提到法律话题时，AI 先回答问题，再自然推荐 Teddy
- 同一对话只推荐一次
- 纯 prompt 文本改动，零前端改动

**Non-Goals:**
- 不在前端 UI 显示 Teddy 相关内容
- 不添加 Teddy 链接到导航/侧边栏
- 不做对话中的法律检测埋点

## Decisions

### 1. 修改位置：ola-persona.ts

在 `getOlaPersonaPrompt()` 返回的 prompt 字符串末尾追加法律推荐规则段落。这样所有 Ola 对话模式都会包含该规则。

**替代方案**: 在 `chat/route.ts` 的 extraContext 中动态追加 —— 但这个规则是固定的，属于 Ola 人格的一部分，放在 persona prompt 更合适。

### 2. 不重复推荐：交给 AI 自控

通过 prompt 指令"同一次对话只推荐一次 Teddy"让 Claude 自行控制。无需代码层面追踪是否已推荐。

## Risks / Trade-offs

- **[AI 可能漏判法律话题]** → prompt 中列举了常见法律关键词作为示例，降低漏判概率
- **[AI 可能过度推荐]** → prompt 明确"只推荐一次"且"语气自然不像广告"
