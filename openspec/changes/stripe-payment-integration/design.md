## Context

Koala PhD 有完整的积分系统（`user_profiles.credits_remaining` + `credit_transactions`），用户通过免费途径获取积分（注册 30、签到 2/天、邀请 15+5），消耗积分使用 AI 功能（对话 1、匹配 2、规划 3、套磁信 5、润色 5）。`stripe@22.1.1` 已安装但未集成。

现有订阅 UI 在 `/koala/pricing`，定义在 `app/lib/constants.ts` 的 `SUBSCRIPTION_TIERS`（Starter $19.90 / Pro $49 / Elite $99），但无真实支付逻辑。

已知问题：`schema.sql` 中有旧的 `user_credits` 表与 `user_profiles.credits_remaining` 并存，需统一。

## Goals / Non-Goals

**Goals:**
- 用户可通过 Stripe Checkout 购买积分充值包（4 档）
- 用户可通过 Stripe Checkout 订阅月度会员（3 档）
- Webhook 自动处理付款确认 → 发放积分 / 激活订阅
- 用户可通过 Stripe Customer Portal 管理订阅（升降级/取消/更换支付方式）
- 积分不足时前端引导到充值页面
- Admin 后台可查看收入统计

**Non-Goals:**
- 不做退款流程自动化（通过 Stripe Dashboard 手动处理）
- 不做优惠券/折扣码系统（后续迭代）
- 不做年度订阅（先验证月度模型）
- 不迁移历史 `user_credits` 表数据（该表无生产数据）
- 不做多币种支持（仅 AUD）

## Decisions

### 1. 使用 Stripe Checkout（托管支付页）而非 Stripe Elements（嵌入式）

**选择**: Stripe Checkout hosted page

**理由**:
- 零前端支付 UI 开发，Stripe 托管 PCI 合规
- 自动适配移动端、支持 Apple Pay / Google Pay
- 支持 payment 和 subscription 两种模式
- 缺点是用户离开站点跳转，但转化率差异对早期产品影响小

**替代方案**: Stripe Elements 嵌入式表单 — 需处理 PCI、自建 UI、更多前端代码

### 2. 订阅管理使用 Stripe Customer Portal

**选择**: Stripe Customer Portal（Stripe 托管的订阅管理页面）

**理由**:
- 零开发成本处理升降级、取消、支付方式更换、发票下载
- Stripe 自动计算 proration
- 通过 `POST /api/stripe/portal` 生成临时 URL，重定向用户过去

**替代方案**: 自建订阅管理 UI — 需处理 proration 计算、支付方式更新、大量前端工作

### 3. Stripe Customer ID 存储策略

**选择**: `user_profiles.stripe_customer_id` 列

**理由**:
- 首次支付时用 `stripe.customers.create({ email, metadata: { supabase_user_id } })` 创建
- 后续支付复用同一 customer，关联支付历史
- 通过 `metadata.supabase_user_id` 在 webhook 中反查用户

### 4. 订阅状态存储

**选择**: 新建 `subscriptions` 表，同时更新 `user_profiles.plan_type`

**数据流**:
```
Stripe webhook (invoice.paid / subscription.updated / subscription.deleted)
  → 更新 subscriptions 表（stripe 原始状态）
  → 同步 user_profiles.plan_type（业务状态，供现有代码查询）
```

**`subscriptions` 表结构**:
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'pro', 'elite')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**理由**: 双写保证现有代码（检查 `plan_type`、Elite 免费逻辑）无需改动，同时有完整订阅数据可查询。

### 5. Webhook 安全验证

**选择**: `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`

**关键**: Next.js API route 必须读取 raw body（不能用 `req.json()`），否则签名验证失败。

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  // ...
}
```

### 6. 积分发放策略

**积分充值包**: `checkout.session.completed` + `mode === 'payment'` → 立即加积分

**订阅首月**: `checkout.session.completed` + `mode === 'subscription'` → 立即发放当月积分

**订阅续费**: `invoice.paid` + `billing_reason === 'subscription_cycle'` → 发放下月积分

**幂等性**: 用 `stripe_event_id` 或 `invoice_id` 作为 `credit_transactions.reference_id`，防止重复发放。在插入前检查是否已存在相同 `reference_id` 的记录。

### 7. Stripe Products/Prices 配置

**在 Stripe Dashboard 中创建**（不通过代码创建）:

积分充值包（one-time prices）:
- `credit_starter`: A$4.99, metadata: `{ credits: "50", type: "credit_pack" }`
- `credit_standard`: A$9.99, metadata: `{ credits: "120", type: "credit_pack" }`
- `credit_pro`: A$19.99, metadata: `{ credits: "280", type: "credit_pack" }`
- `credit_flagship`: A$49.99, metadata: `{ credits: "800", type: "credit_pack" }`

订阅计划（recurring prices）:
- `sub_starter`: A$19.90/month, metadata: `{ tier: "starter", monthly_credits: "10", type: "subscription" }`
- `sub_pro`: A$49.00/month, metadata: `{ tier: "pro", monthly_credits: "30", type: "subscription" }`
- `sub_elite`: A$99.00/month, metadata: `{ tier: "elite", monthly_credits: "100", type: "subscription" }`

**Price IDs 存储**: 在 `app/lib/constants.ts` 中用环境变量或硬编码 Price ID 映射。

### 8. 前端交互流程

**购买积分包**:
```
用户在 /koala/pricing 选择积分包
  → POST /api/stripe/checkout { type: 'credit_pack', priceId: 'price_xxx' }
  → 后端创建 Checkout Session，返回 { url }
  → 前端 window.location.href = url（跳转 Stripe）
  → 付款完成 → 重定向回 /koala/pricing?success=true
  → Webhook 异步处理积分发放
```

**订阅会员**:
```
用户在 /koala/pricing 选择订阅
  → POST /api/stripe/checkout { type: 'subscription', priceId: 'price_xxx' }
  → 同上跳转流程
  → Webhook 处理：创建 subscriptions 记录 + 更新 plan_type + 发放首月积分
```

**积分不足引导**:
```
用户使用 AI 功能 → /api/user/credits/spend 返回 402
  → 前端弹出 Modal：显示所需积分、当前余额
  → [充值积分] 按钮 → 跳转 /koala/pricing#credit-packs
  → [查看订阅] 按钮 → 跳转 /koala/pricing#subscriptions
```

## Risks / Trade-offs

**[Webhook 延迟]** → 付款成功后积分可能延迟几秒到达。Mitigation: 成功页显示"积分正在到账"提示，前端轮询 credits 接口直到更新。

**[Webhook 重复投递]** → Stripe 可能重试同一事件。Mitigation: 用 `reference_id` 幂等检查，INSERT 前 SELECT 检查是否已存在。

**[订阅降级时积分已用]** → 用户本月已用完高档积分后降级。Mitigation: 降级在当期结束时生效（Stripe `cancel_at_period_end` 或 proration），不回收已用积分。

**[Stripe Customer Portal 语言]** → Portal 默认英文。Mitigation: 在 Stripe Dashboard 配置 Portal 支持中文，或接受英文（目标用户群可接受）。

**[测试环境]** → 需要 Stripe Test Mode 的 Key 做开发。Mitigation: 开发环境用 `sk_test_` / `pk_test_` key，Webhook 用 Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe`。

## Migration Plan

1. **Phase 1 — 数据库**: 新增 `stripe_customer_id` 列 + `subscriptions` 表（Supabase migration）
2. **Phase 2 — 后端 API**: 实现 4 个 Stripe API routes + webhook handler
3. **Phase 3 — Stripe 配置**: 在 Stripe Dashboard 创建 Products/Prices，配置 Customer Portal，添加 Webhook endpoint
4. **Phase 4 — 前端**: 改造 pricing 页面，添加积分不足弹窗
5. **Phase 5 — Admin**: 收入面板
6. **Phase 6 — 测试**: 用 Stripe Test Mode 端到端测试

**回滚策略**: 各 API route 独立部署，如有问题可单独回滚。Webhook handler 失败不影响现有积分系统。`plan_type` 字段兼容现有代码。
