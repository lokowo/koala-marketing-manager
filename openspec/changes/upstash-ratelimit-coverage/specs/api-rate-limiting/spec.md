## ADDED Requirements

### Requirement: Auth endpoints rate limiting
系统 SHALL 对注册、忘记密码、发送验证码端点按 IP 限流，每分钟最多 3 次。

#### Scenario: Register rate limited
- **WHEN** 同一 IP 在 1 分钟内第 4 次调用 `POST /api/auth/register`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Forgot password rate limited
- **WHEN** 同一 IP 在 1 分钟内第 4 次调用 `POST /api/auth/forgot-password`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Send verification rate limited
- **WHEN** 同一 IP 在 1 分钟内第 4 次调用 `POST /api/auth/send-verification`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

### Requirement: AI endpoints rate limiting
系统 SHALL 对所有调用付费 AI API 的端点按 user.id 限流，每分钟最多 10 次。

#### Scenario: Banner image generation rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/admin/banners/generate-image`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Banner prompt generation rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/admin/banners/generate-prompt`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Voice transcription rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/voice/transcribe`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Blog generation rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/blog/generate`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Blog cover generation rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/blog/generate-cover`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Blog single image generation rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/blog/generate-single-image`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Blog batch images generation rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/blog/generate-images`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Professor web search rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `GET /api/professors/web-search`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

#### Scenario: Professor auto search rate limited
- **WHEN** 同一用户在 1 分钟内第 11 次调用 `POST /api/professors/auto-search`
- **THEN** 返回 HTTP 429 + `{ error: "操作太频繁，请稍后再试" }`

### Requirement: Graceful fallback without Upstash config
系统 SHALL 在没有 Upstash 环境变量时跳过限流检查，所有 API 正常工作。

#### Scenario: No Upstash config
- **WHEN** `UPSTASH_REDIS_REST_URL` 未设置
- **THEN** 所有限流器为 null，限流检查被跳过，API 正常处理请求

### Requirement: Consistent error response format
所有限流触发时 SHALL 返回统一格式：HTTP 429 + JSON `{ error: "操作太频繁，请稍后再试" }`。

#### Scenario: Chinese error message
- **WHEN** 任何端点触发限流
- **THEN** 错误消息为中文 "操作太频繁，请稍后再试"，不包含技术细节
