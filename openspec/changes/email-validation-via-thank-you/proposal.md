## Why

问卷收集到的邮箱有大量无效地址（打字错误、虚假邮箱），Sales 跟进时才发现联系不上，浪费人力。通过提交后自动发感谢邮件，利用 Resend Webhook 回调判断邮箱是否真实可达，在 Sales 跟进前就标记出无效邮箱。

## What Changes

- 问卷提交成功后，异步发送品牌感谢邮件（Resend API）
- 新增 Webhook 端点接收 Resend 投递状态回调（delivered/bounced/complained）
- 根据回调更新 `survey_responses.metadata.email_status`（pending → valid / invalid）
- Sales 后台客户列表显示邮箱验证状态标记（绿色✓ / 红色✗ / 灰色等待中）
- 感谢邮件内容：感谢参与 + Koala PhD 简介 + 注册链接

## Capabilities

### New Capabilities
- `email-validation`: 通过 Resend 感谢邮件 + Webhook 回调实现邮箱有效性验证
- `survey-thank-you-email`: 问卷提交后的自动感谢邮件发送

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

- **API 新增**: `POST /api/webhooks/resend` — Webhook 接收端点
- **API 修改**: `POST /api/surveys/public/[code]/respond/[rid]` — 提交后触发邮件发送
- **服务层**: `app/lib/services/emailService.ts` — 新增 `sendSurveyThankYouEmail()`
- **前端修改**: `app/dashboard/sales/page.tsx` — 客户列表增加邮箱状态标记
- **数据库**: `survey_responses.metadata.email_status` 字段已有，需新增 `metadata.resend_email_id` 关联回调
- **依赖**: Resend SDK（已安装）、Resend Webhook Signing Secret（新增环境变量 `RESEND_WEBHOOK_SECRET`）
