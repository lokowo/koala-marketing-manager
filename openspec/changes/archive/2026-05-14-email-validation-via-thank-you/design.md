## Context

问卷提交后 `survey_responses.metadata.email_status` 只做格式校验（regex），不验证邮箱是否真实可达。Sales 跟进时常遇到无效邮箱。项目已有 Resend SDK 和 `emailService.ts` 的 `brandTemplate()` 基础设施。

## Goals / Non-Goals

**Goals:**
- 问卷提交后异步发送感谢邮件，不阻塞用户响应
- 通过 Resend Webhook 回调更新 `email_status`（pending → valid / invalid）
- Sales 后台客户列表显示邮箱验证状态

**Non-Goals:**
- 不做邮箱 MX 记录预检查（Resend 投递本身就是最终验证）
- 不做邮件打开/点击追踪
- 不改变现有前端格式校验逻辑
- 不做退信后的自动重发

## Decisions

### 1. 在 `completeResponse()` 之后异步发送，不用队列

发送感谢邮件直接在问卷提交 API 的 POST handler 中调用，在 `completeResponse()` 成功后、`return Response.json()` 之前。用 fire-and-forget（不 await），失败不影响提交响应。

**Why not Inngest queue**: 感谢邮件是单次低延迟操作，不需要重试策略。Resend 本身有重试机制。额外的队列增加复杂度但收益小。

### 2. 用 Resend headers.metadata 关联回调

Resend 支持在发送时附加 metadata，Webhook 回调会携带同样的 metadata。存入 `{ survey_response_id: rid }` 作为关联 key。同时将 Resend 返回的 `email_id` 存入 `survey_responses.metadata.resend_email_id` 用于调试。

### 3. Webhook 签名验证

用 `svix` 库验证 Resend Webhook 签名（Resend 使用 Svix 基础设施）。需要新增环境变量 `RESEND_WEBHOOK_SECRET`。

### 4. 感谢邮件发件人地址

用 `hello@koalaphd.com` 而非现有的 `noreply@koalaphd.com`。感谢邮件应该看起来友好可回复。需要在 Resend 后台验证此发件地址。

### 5. email_status 状态流

```
提交时格式错误 → 'invalid'（直接标记，不发邮件）
格式正确 → 'pending'（发感谢邮件）
Webhook: delivered → 'valid'
Webhook: bounced/complained → 'invalid'
未收到回调 → 保持 'pending'
```

## Risks / Trade-offs

- **[Risk] Webhook 延迟**: Resend 回调可能延迟数分钟 → 用户看到 'pending' 状态是正常的，Sales 后台标注为"验证中"
- **[Risk] Webhook endpoint 被恶意调用**: → Svix 签名验证 + 只接受已知事件类型
- **[Risk] Resend API key 未配置**: → 发送失败时 email_status 保持 'pending'，不影响提交流程
- **[Trade-off] fire-and-forget 不保证发送**: 如果发送失败不会重试 → 可接受，email_status 停留在 pending，Sales 可手动验证
