# Stripe 支付集成现状审计

> 审计日期：2026-05-25
> 审计范围：代码层面全量 Stripe 相关文件，结合已知数据库状态

---

## 1. Stripe 相关文件与路由清单

### SDK 初始化

| 文件 | 状态 |
|------|------|
| `app/lib/server/stripe.ts` | **已跑通** — 单例 `getStripe()`，API 版本 `2026-04-22.dahlia`，含 `getOrCreateCustomer`、价格校验、订阅查询等辅助函数 |

### API 路由

| 路由 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/api/stripe/checkout` | POST | 创建 Checkout Session（积分包 + 订阅） | **已跑通** |
| `/api/stripe/portal` | POST | 打开 Stripe Customer Portal | **已跑通** |
| `/api/stripe/subscription` | GET | 查询当前订阅状态 | **已跑通** |
| `/api/stripe/upgrade/preview` | POST | 升降级预览（含 proration 计算） | **已跑通** |
| `/api/stripe/upgrade/confirm` | POST | 确认升降级 | **已跑通** |
| `/api/webhooks/stripe` | POST | Webhook 处理器 | **已跑通** |
| `/api/user/credits` | GET/POST | 余额查询 / 签到 / 成就领取 | **已跑通** |
| `/api/user/credits/spend` | POST | 通用积分消费端点 | **半成品** — 有完整逻辑但无调用方 |
| `/api/outreach/credits` | GET/POST | 套磁信积分查询与消费 | **已跑通** |
| `/api/cron/auto-confirm-commissions` | GET | 30 天自动确认提成 | **已跑通** |

### 前端

| 文件 | 状态 |
|------|------|
| `app/koala/pricing/PricingClient.tsx` | **已跑通** — 调用 `/api/stripe/checkout` 创建 Session，成功后轮询余额 |

### 价格配置

| 文件 | 状态 |
|------|------|
| `app/lib/constants.ts` (L70-155) | **已跑通** — 4 个积分包 + 3 个订阅档位，每个 `stripePriceId` 读取 `NEXT_PUBLIC_STRIPE_PRICE_*` 环境变量 |

### 环境变量

| 变量 | .env.local | Vercel Production | Vercel Preview | 状态 |
|------|-----------|-------------------|----------------|------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | ✅ (Encrypted) | ✅ | **已跑通** — 本地 test 模式 |
| `STRIPE_WEBHOOK_SECRET` | ❌ 缺失 | ✅ (Encrypted) | ✅ | **半成品** — 生产有但本地缺，本地无法调试 webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ `pk_test_...` | ✅ | ✅ | **已跑通** |
| `NEXT_PUBLIC_STRIPE_PRICE_CREDIT_*` (×4) | ✅ | ✅ | ✅ | **已跑通** |
| `NEXT_PUBLIC_STRIPE_PRICE_SUB_*` (×3) | ✅ | ✅ | ✅ | **已跑通** |

---

## 2. Checkout Session 创建 → 定价页链路

**状态：已跑通**

链路：`PricingClient.tsx` → `handleCheckout(priceId)` → `POST /api/stripe/checkout` → `stripe.checkout.sessions.create()`

- 积分包：`mode: 'payment'`，`allow_promotion_codes: true`
- 订阅：`mode: 'subscription'`，`allow_promotion_codes: true`
- 成功回调：`/koala/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`
- 取消回调：`/koala/pricing?canceled=true`
- 包含 `metadata: { supabase_user_id }` 用于 webhook 关联用户
- `getOrCreateCustomer()` 已处理 Stripe Customer 创建/复用/跨模式清理

**结论：用户点"购买"能走到 Stripe 收银台。定价页按钮是功能性的，非纯展示。**

---

## 3. Webhook 处理

**状态：已跑通**

### 处理的事件

| 事件 | 处理函数 | 操作 |
|------|---------|------|
| `checkout.session.completed` | `handleCheckoutCompleted` | 分发到积分包/订阅处理 |
| `invoice.paid` | `handleInvoicePaid` | 订阅续费：同步计费周期 + 发放月度积分 + 创建提成 |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | 同步 tier / status / 计费周期到 subscriptions 表和 user_profiles |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | 标记 canceled + 重置 plan_type 为 free |
| `charge.refunded` | `handleChargeRefunded` | 撤销/回退对应提成 |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | 记录 audit log |

### 签名校验

**已实现** — `getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)` (route.ts:17)

### 幂等去重

**已实现** — `idempotentCheck(referenceId)` 检查 `credit_transactions` 表是否已存在相同 `reference_id`，防止重复投递导致重复加积分。

- 积分包：`checkout_{session.id}`
- 新订阅：`sub_start_{subscriptionId}`
- 续费：`invoice_{invoice.id}`

---

## 4. 计费模型与额度管控

### 当前实际运行的是两套并行系统

#### 系统 A：积分余额（Credits）

| 组件 | 说明 |
|------|------|
| **余额存储** | `user_profiles.credits_remaining` — **唯一真值源** |
| **流水记录** | `credit_transactions` 表 — 46 行，每笔加减都有记录 |
| **充值入口** | Stripe webhook → `addCredits()` → 更新余额 + 写流水 |
| **消费入口** | `deductCredit()` (outreach/credits) — 仅用于套磁信 |
| **消费端点** | `/api/user/credits/spend` — 定义了 6 种消费类型但 **前端从未调用** |
| **赚取方式** | 注册送 30、每日签到 +2、成就奖励、推荐奖励、订阅月度积分 |

#### 系统 B：用量计数（Usage Tracking）

| 组件 | 说明 |
|------|------|
| **计数存储** | `user_usage_tracking` 表 — 按天记录，7 行 |
| **限额逻辑** | `usageTracker.ts` — 按 tier (free/starter/pro/elite) + action type 定义限额 |
| **检查调用方** | 套磁信 (`generate-cold-email`)、CV (`cv/generate`)、RP (`research-proposal/generate`)、推荐信 (`recommendation-letter/generate`) |
| **不检查的** | **AI 对话 (`/api/ai/chat`) — 完全没有任何积分或用量检查** |

### AI 模式额度检查现状

| 功能 | 积分扣减 | 用量检查 | 余额为 0 / 达上限时 |
|------|---------|---------|-------------------|
| AI 对话 (`/api/ai/chat`) | ❌ 不扣 | ❌ 不查 | **免费跑，无任何拦截** |
| 套磁信 - 新路由 (`/api/chat/generate-cold-email`) | ❌ 不扣 | ✅ `checkUsage('email')` | 返回 403 "今日次数已用完" |
| 套磁信 - 旧路由 (`/api/outreach/generate`) | ✅ 扣 1 积分 | ❌ 不查用量 | 返回 402 "积分不足" |
| CV 生成 | ❌ 不扣 | ✅ `checkUsage('cv')` | 返回 403 |
| RP 生成 | ❌ 不扣 | ✅ `checkUsage('research_proposal')` | 返回 403 |
| 推荐信 | ❌ 不扣 | ✅ `checkUsage('recommendation_letter')` | 返回 403 |
| 通用消费 (`/api/user/credits/spend`) | ✅ 按类型扣 | ❌ | 返回 402 — **但无调用方** |

### `user_credits` 表

**状态：废弃 / 从未使用**

该表仅出现在 `database.types.ts` 的类型定义中，应用代码中没有任何读写操作。所有积分逻辑使用 `user_profiles.credits_remaining` + `credit_transactions`。0 行是正常现象——不是 bug，是这张表从未被接入。

---

## 5. Webhook 写入的表

### handleCreditPackPurchase

| 目标表 | 字段 | 状态 |
|--------|------|------|
| `credit_transactions` | amount, balance_after, type='purchase', reference_id | ✅ 已写 |
| `user_profiles` | credits_remaining (累加) | ✅ 已写 |
| `sales_commissions` | 提成记录（如有推荐关系） | ✅ 已写 |
| `sales_referrals` | total_revenue, total_commission (累加) | ✅ 已写 |
| `user_credits` | — | ❌ 未写（表已废弃） |

### handleNewSubscription

| 目标表 | 字段 | 状态 |
|--------|------|------|
| `subscriptions` | stripe_subscription_id, tier, status, 计费周期等 (upsert) | ✅ 已写 |
| `user_profiles` | plan_type, updated_at | ✅ 已写 |
| `user_usage_tracking` | subscription_tier (当天行) | ✅ 已写 |
| `credit_transactions` | 月度积分发放 | ✅ 已写 |
| `user_profiles` | credits_remaining (累加月度积分) | ✅ 已写 |
| `sales_commissions` | 提成记录 | ✅ 已写 |
| `user_credits` | — | ❌ 未写（表已废弃） |

### user_credits 为什么 0 行

**不是 bug，是废弃表。** 所有积分操作都通过 `user_profiles.credits_remaining` + `credit_transactions` 完成。`user_credits` 表在设计时可能作为独立积分余额表，但实际开发选择了直接在 `user_profiles` 上维护余额字段。可以安全删除该表。

---

## 6. Test 模式 vs Live 模式

| 环境 | 判断依据 | 模式 |
|------|---------|------|
| 本地 (.env.local) | `STRIPE_SECRET_KEY=sk_test_...`，`PUBLISHABLE_KEY=pk_test_...` | **Test 模式** |
| Vercel Production | Key 加密存储，无法直接判断 | **需确认** — 如果 Production 用的也是 test key 则无法收真钱 |
| Vercel Preview | 同上 | **需确认** |

**所需环境变量齐全性：**

| 变量 | 本地 | 生产 | 说明 |
|------|------|------|------|
| STRIPE_SECRET_KEY | ✅ | ✅ | |
| STRIPE_WEBHOOK_SECRET | ❌ | ✅ | 本地缺失，webhook 本地调试会报签名错误 |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ | ✅ | |
| 7 个 Price ID | ✅ | ✅ | 需确认生产 Price ID 是否指向 live 模式产品 |

---

## 发现的 Bug 与设计冲突

### 🔴 BUG-1：AI 对话完全不检查额度

**文件：** `app/api/ai/chat/route.ts`
**问题：** 该路由无任何 `checkUsage` 或积分扣减调用。`FREE_LIMITS.dailyAiTurns = 10` 仅在 `constants.ts` 中声明，但 AI 对话路由从未读取或执行该限制。所有用户（包括免费用户）可以无限使用 AI 对话。
**影响：** 免费用户无限消耗 Anthropic API，无付费转化动力。

### 🔴 BUG-2：两套套磁信路由，计费逻辑冲突

**文件：** `app/api/outreach/generate/route.ts` vs `app/api/chat/generate-cold-email/route.ts`
**问题：** 存在两个生成套磁信的路由：

| 路由 | 积分扣减 | 用量检查 | 拒绝条件 |
|------|---------|---------|---------|
| `/api/outreach/generate` | ✅ 扣 1 积分（RPC `deduct_credit`） | ❌ | 402 积分不足 |
| `/api/chat/generate-cold-email` | ❌ 不扣 | ✅ `checkUsage('email')` | 403 次数用完 |

前端使用哪个路由决定了用户被限制的方式。如果前端走新路由，用户可以不消耗积分地生成套磁信（只受用量计数限制）。

### 🟡 设计冲突-1：积分包卖的"积分"几乎没有消费场景

**问题：** `CREDIT_PACKAGES` 出售 50-800 积分，但唯一真正扣减积分的场景只有旧版套磁信路由 (`/api/outreach/generate`)。AI 对话、CV、RP、推荐信等功能全部走 `usageTracker` 的次数限制，不扣积分。
**影响：** 用户购买积分包后，积分大部分无法消费。

### 🟡 设计冲突-2：`/api/user/credits/spend` 是孤岛

**问题：** 该端点定义了 6 种消费类型（match=2, email=5, chat=1, plan=3, polish=5, blog=10），逻辑完整（含 Elite 免费、余额不足返回 402），但前端和其他 API 均未调用它。

### 🟡 设计冲突-3：`user_credits` 表是死表

**问题：** 数据库有 `user_credits` 表（含 credit_balance, subscription_tier 等字段），但代码中从未读写。余额实际维护在 `user_profiles.credits_remaining`。两张表职责重叠，造成混淆。

### 🟡 注意事项-1：STRIPE_WEBHOOK_SECRET 本地缺失

**问题：** `.env.local` 中没有 `STRIPE_WEBHOOK_SECRET`。本地开发时 webhook 路由会因 `process.env.STRIPE_WEBHOOK_SECRET!` 为 undefined 导致签名校验必定失败。生产环境已配置，不影响线上。

### 🟡 注意事项-2：提成金额基准已修复但需验证

**问题：** 刚修复了 `handleCreditPackPurchase` 和 `handleNewSubscription` 使用 `session.amount_total / 100` 替代硬编码价格。需要一次真实购买验证 `session.amount_total` 字段确实存在且非 null。

---

## 总结：各模块状态一览

| 模块 | 状态 | 说明 |
|------|------|------|
| Stripe SDK 初始化 | ✅ 已跑通 | 单例模式，API 版本最新 |
| Checkout Session 创建 | ✅ 已跑通 | 积分包 + 订阅均可创建，支持优惠码 |
| 定价页 UI → Checkout | ✅ 已跑通 | 按钮功能性，非纯展示 |
| Webhook 签名校验 | ✅ 已跑通 | 生产环境 secret 已配置 |
| Webhook 幂等去重 | ✅ 已跑通 | 基于 credit_transactions.reference_id |
| 积分充值到账 | ✅ 已跑通 | webhook → addCredits → user_profiles + credit_transactions |
| 订阅状态同步 | ✅ 已跑通 | 新建 / 续费 / 升降级 / 取消全覆盖 |
| Customer Portal | ✅ 已跑通 | 可管理订阅和支付方式 |
| 升降级流程 | ✅ 已跑通 | Preview + Confirm，含 proration |
| 提成计算 | ✅ 已跑通 | 阶梯比例，自动晋级，30 天自动确认 |
| 退款处理 | ✅ 已跑通 | 撤销提成 + 回退 referral 统计 |
| AI 对话额度限制 | ❌ 缺失 | 无任何检查，免费无限用 |
| 积分消费场景 | 🟡 半成品 | 仅旧版套磁信扣积分，其他功能不扣 |
| `user_credits` 表 | ❌ 废弃 | 0 行，代码无读写，可删除 |
| `/api/user/credits/spend` | 🟡 半成品 | 逻辑完整但无调用方 |
| 本地 webhook 调试 | 🟡 半成品 | 缺 STRIPE_WEBHOOK_SECRET |
| 生产 live/test 确认 | 🟡 待确认 | 需检查 Vercel Production 的 STRIPE_SECRET_KEY 是否为 sk_live_ |
