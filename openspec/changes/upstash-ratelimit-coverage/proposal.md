## Why

Upstash Redis 已配置，但限流只覆盖了 4 个 API（ai/chat、outreach/generate、问卷提交 x2）。多个花钱的 AI/OpenAI 端点（图片生成、语音转写、博客生成）和防刷端点（注册、忘记密码、发验证码）完全没有限流保护，存在被滥用刷爆账单或批量注册的风险。

## What Changes

- 新增 `authLimiter`（3次/分钟/IP），用于注册、忘记密码、发送验证码
- 给以下未受保护的 API 接入 `aiLimiter`（10次/分钟）：
  - `POST /api/admin/banners/generate-image` — OpenAI gpt-image-1（最贵）
  - `POST /api/admin/banners/generate-prompt` — Claude API
  - `POST /api/voice/transcribe` — OpenAI Whisper
  - `POST /api/blog/generate` — Claude API
  - `POST /api/blog/generate-cover` — OpenAI images
  - `POST /api/blog/generate-single-image` — OpenAI images
  - `POST /api/blog/generate-images` — OpenAI images
  - `POST /api/professors/web-search` — Claude API
  - `POST /api/professors/auto-search` — 外部 API 搜索
- 给以下防刷端点接入 `authLimiter`：
  - `POST /api/auth/register`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/send-verification`
- 限流触发时统一返回 HTTP 429 + 中文提示 "操作太频繁，请稍后再试"
- 无 Upstash 配置时（env 为空）graceful fallback，不影响正常使用

## Capabilities

### New Capabilities
- `api-rate-limiting`: 定义所有需要限流的 API 端点、限流规则、响应格式、graceful fallback 行为

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

- **代码**: `app/lib/ratelimit.ts` 新增 authLimiter；约 12 个 API route 文件各加 ~5 行限流检查代码
- **依赖**: 无新依赖，复用已有的 `@upstash/ratelimit` + `@upstash/redis`
- **API 行为**: 被限流时返回 `{ error: "操作太频繁，请稍后再试" }` + 429 状态码，前端需处理此响应（现有前端已处理 429）
- **向后兼容**: 完全兼容，无 breaking change。没有 Upstash 配置时行为与现在一致（不限流）
