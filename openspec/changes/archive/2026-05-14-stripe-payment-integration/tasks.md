## 1. 数据库 & 基础设施

- [x] 1.1 新增 `user_profiles.stripe_customer_id` 列（TEXT, nullable）
- [x] 1.2 创建 `subscriptions` 表（id, user_id, stripe_subscription_id, stripe_customer_id, tier, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at）
- [x] 1.3 在 `app/lib/constants.ts` 新增 `CREDIT_PACKAGES` 常量（4 档积分充值包定义：名称、价格、积分数、Stripe Price ID）
- [x] 1.4 在 `app/lib/constants.ts` 中为 `SUBSCRIPTION_TIERS` 各档添加 `stripePriceId` 字段
- [x] 1.5 创建 `app/lib/server/stripe.ts` — Stripe SDK 初始化 + 辅助函数（getOrCreateCustomer, 价格白名单校验）

## 2. Stripe Checkout API

- [x] 2.1 实现 `POST /api/stripe/checkout` — 积分充值包模式（mode: payment），创建 Checkout Session，返回 { url }
- [x] 2.2 实现 `POST /api/stripe/checkout` — 订阅模式（mode: subscription），检查用户无活跃订阅后创建 Session
- [x] 2.3 实现 `POST /api/stripe/portal` — 创建 Stripe Customer Portal Session，返回 { url }
- [x] 2.4 实现 `GET /api/stripe/subscription` — 查询当前用户订阅状态，返回 subscriptions 记录 + plan_type

## 3. Stripe Webhook

- [x] 3.1 实现 `POST /api/webhooks/stripe` — raw body 读取 + 签名验证 + 事件路由
- [x] 3.2 处理 `checkout.session.completed` (mode: payment) — 查 price metadata 获取积分数，幂等加积分 + 写 credit_transactions(type: 'purchase')
- [x] 3.3 处理 `checkout.session.completed` (mode: subscription) — 创建 subscriptions 记录 + 更新 plan_type + 发放首月积分
- [x] 3.4 处理 `invoice.paid` (billing_reason: subscription_cycle) — 幂等发放月度积分 + 更新 current_period_end
- [x] 3.5 处理 `customer.subscription.updated` — 同步 tier/status/cancel_at_period_end 到 subscriptions 表 + user_profiles.plan_type
- [x] 3.6 处理 `customer.subscription.deleted` — 设 status='canceled' + plan_type='free'

## 4. 前端付费页面

- [x] 4.1 改造 `/koala/pricing` — 积分充值包区域：4 张卡片 + 购买按钮，点击调用 /api/stripe/checkout 并跳转
- [x] 4.2 改造 `/koala/pricing` — 订阅区域：3 张卡片，根据用户当前 plan_type 显示"当前方案"/"订阅"/"升级"按钮
- [x] 4.3 已订阅用户显示"管理订阅"按钮，点击调用 /api/stripe/portal 并跳转
- [x] 4.4 pricing 页顶部显示当前积分余额，从 /api/user/credits 获取
- [x] 4.5 处理 success/canceled URL 参数：成功时显示 toast + 轮询积分更新，取消时显示提示
- [x] 4.6 购买历史区域：显示 credit_transactions 中 type 为 purchase/subscription_credit 的记录

## 5. 积分不足引导

- [x] 5.1 创建 `InsufficientCreditsModal` 组件 — 显示功能名称、所需积分、当前余额、充值/订阅按钮
- [x] 5.2 在 AI 功能调用处（对话、匹配、套磁信等）捕获 402 响应，弹出 InsufficientCreditsModal

## 6. Admin 后台

- [x] 6.1 实现 `GET /api/admin/revenue` — 查询今日/本周/本月收入统计
- [x] 6.2 实现 `GET /api/admin/subscribers` — 查询付费用户列表 + 订阅统计（活跃数/MRR/本月新增/流失）
- [x] 6.3 在 Admin Dashboard 新增收入面板 UI — 收入卡片 + 付费用户表格 + 订阅统计图表

## 7. 清理 & 集成

- [x] 7.1 更新 `/api/outreach/credits` POST — 移除 501 TODO，改为调用 Stripe checkout 逻辑或重定向到 pricing 页
- [x] 7.2 统一积分系统 — 确认所有代码使用 `user_profiles.credits_remaining`，清理对旧 `user_credits.credit_balance` 的引用
- [x] 7.3 在 `credit_transactions` type CHECK 约束中添加 `'purchase'` 和 `'subscription_credit'`
