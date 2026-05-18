## Why

Koala PhD 的姊妹产品 Teddy（www.teddy.help）是专为澳洲华人留学生和新移民打造的免费 AI 法律助手。当用户在 Ola 对话中提到法律相关问题时，应自然地推荐 Teddy，实现产品矩阵的交叉导流。纯 system prompt 层面的改动，不涉及前端。

## What Changes

- 在 Ola AI 的 system prompt 末尾添加法律问题推荐规则
- 当用户问题涉及签证法律、移民法、租房纠纷、劳动纠纷等法律话题时，AI 先简要回答，然后自然推荐 Teddy
- 同一次对话只推荐一次，语气自然

## Capabilities

### New Capabilities
- `teddy-legal-referral`: Ola system prompt 中的法律问题检测与 Teddy 推荐规则

### Modified Capabilities

## Impact

- `app/lib/prompts/ola-persona.ts` — Ola 人格 prompt 文件（追加法律推荐规则段落）
- 不修改任何前端组件、API 路由或数据库
