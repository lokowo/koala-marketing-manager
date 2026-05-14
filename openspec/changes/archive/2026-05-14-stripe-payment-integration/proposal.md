## Why

Koala PhD 当前的积分系统完全依赖免费获取（注册送 30、每日签到 2、邀请最多 45），用户无法付费购买积分或订阅高级功能。`stripe@22.1.1` 已安装但零集成，`/api/outreach/credits` POST 返回 501 "coming soon"。平台需要接入 Stripe 实现真实收入闭环：积分充值包（一次性）+ 月度订阅（自动续费），将现有 pricing UI 从展示页变为可交易页面。

## What Changes

### 新增 Stripe 支付后端
- 新增 `POST /api/stripe/checkout` — 创建 Stripe Checkout Session（积分充值包 + 订阅）
- 新增 `POST /api/webhooks/stripe` — 接收 Stripe Webhook（`checkout.session.completed`、`invoice.paid`、`customer.subscription.updated`、`customer.subscription.deleted`）
- 新增 `POST /api/stripe/portal` — 创建 Stripe Customer Portal Session（用户自助管理订阅/发票/支付方式）
- 新增 `GET /api/stripe/subscription` — 查询当前用户订阅状态

### 积分充值包（一次性购买，Stripe Checkout mode: payment）
| 套餐 | 价格 (AUD) | 积分 | 单价 | 溢价 |
|------|-----------|------|------|------|
| 入门包 | $4.99 | 50 | $0.10 | — |
| 标准包 | $9.99 | 120 | $0.083 | +20% |
| 专业包 | $19.99 | 280 | $0.071 | +40% |
| 旗舰包 | $49.99 | 800 | $0.062 | +60% |

### 月度订阅（Stripe Checkout mode: subscription）
- 统一使用现有 `SUBSCRIPTION_TIERS` 中的三档：Starter ($19.90) / Pro ($49.00) / Elite ($99.00)
- 订阅生效后每月自动发放 `monthlyCredits`（10/30/100）
- Elite 用户 AI 功能零消耗（保持现有逻辑）
- 用户可通过 Stripe Customer Portal 自助升级/降级/取消

### **BREAKING**: 统一积分系统
- 废弃 `schema.sql` 中的旧 `user_credits` 表（`credit_balance` 字段）
- 统一使用 `user_profiles.credits_remaining` + `credit_transactions` 表
- 新增 `user_profiles.stripe_customer_id` 字段
- 新增 `subscriptions` 表跟踪订阅状态（stripe_subscription_id、tier、status、current_period_end）

### 前端付费页面改造
- 改造 `/koala/pricing` 页面：从纯展示变为可购买（点击按钮 → Stripe Checkout）
- 新增积分充值包选择 UI
- 积分不足时弹窗引导：显示余额 + 跳转充值页

### Admin 后台收入面板
- 新增收入概览（今日/本周/本月）
- 付费用户列表 + 订阅统计

## Capabilities

### New Capabilities
- `stripe-checkout`: Stripe Checkout Session 创建、支付流程、成功/取消回调
- `stripe-webhook`: Stripe Webhook 接收与处理（付款确认、订阅事件、积分发放）
- `stripe-subscription`: 订阅生命周期管理（创建、续费、升降级、取消、Customer Portal）
- `credit-purchase-ui`: 前端积分充值 + 订阅购买页面、积分不足引导弹窗
- `payment-admin`: Admin 后台收入面板（收入统计、付费用户列表、订阅数据）

### Modified Capabilities
_(无现有 spec 需要修改)_

## Impact

### 代码影响
- `app/api/stripe/` — 新增 3 个 API routes
- `app/api/webhooks/stripe/` — 新增 webhook handler
- `app/api/stripe/subscription/` — 新增订阅查询
- `app/koala/pricing/page.tsx` — 改造为可交易页面
- `app/lib/constants.ts` — 新增 `CREDIT_PACKAGES` 常量
- `app/api/user/credits/spend/route.ts` — 积分不足时返回充值引导信息
- `app/api/outreach/credits/route.ts` — 移除 501 TODO，接入真实 Stripe checkout

### 数据库影响
- `user_profiles` 新增 `stripe_customer_id` 列
- 新增 `subscriptions` 表
- `credit_transactions` 新增 type: `'purchase'`、`'subscription_credit'`
- 废弃 `user_credits` 表

### 依赖
- `stripe@22.1.1`（已安装）
- 需要配置环境变量：`STRIPE_SECRET_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`STRIPE_WEBHOOK_SECRET`

### 外部系统
- Stripe Dashboard 需创建对应的 Products + Prices（4 个积分包 + 3 个订阅计划）
- Vercel 需配置 Stripe Webhook endpoint URL
