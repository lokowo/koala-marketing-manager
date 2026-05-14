## 1. 感谢邮件发送

- [ ] 1.1 在 `emailService.ts` 新增 `sendSurveyThankYouEmail(email, name, responseId)` 函数，用 `brandTemplate()` + `ctaButton()`，发件人 `hello@koalaphd.com`，subject `🐨 感谢参与问卷！来认识你的 PhD 导师吧`
- [ ] 1.2 在问卷提交 API `respond/[rid]/route.ts` 的 POST handler 中，`completeResponse()` 之后 fire-and-forget 调用发送函数，email 格式合法时设 `email_status = 'pending'` 并存储 `resend_email_id`

## 2. Resend Webhook 端点

- [ ] 2.1 安装 `svix` 依赖（用于验证 Resend Webhook 签名）
- [ ] 2.2 创建 `POST /api/webhooks/resend/route.ts`：验证 Svix 签名 → 解析事件类型 → 根据 metadata.survey_response_id 更新 `survey_responses.metadata.email_status`（delivered→valid, bounced/complained→invalid）

## 3. Sales 后台邮箱状态显示

- [ ] 3.1 在 `app/dashboard/sales/page.tsx` 客户列表的邮箱字段旁，根据 `email_status` 显示状态标记：valid=绿色✓、invalid=红色✗、pending/无=灰色「验证中」

## 4. 验证

- [ ] 4.1 npm run build
