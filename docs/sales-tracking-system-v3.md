# Koala PhD 分销追踪系统 — 完整设计方案 v3

> **本版本（v3）基于 v2 经过完整 review 后定稿，整合了 10 个修订点。**
> 项目技术栈：Next.js 16 + Supabase + Tailwind CSS + Stripe
> 域名：koalaphd.com | GitHub：lokowo/koala-marketing-manager
> Supabase 项目 ID：geolbgirpkzxrdvozmqw
> 所有 Claude Code 回复用**中文**，遵循 OpenSpec 流程

---

## v3 关键变更摘要（vs v2）

| # | 变更 | 原因 | 影响章节 |
|---|---|---|---|
| 1 | 新增 Stripe 退款/订阅取消事件监听 | 防止退款后佣金照发的财务漏洞 | §四、§五 |
| 2 | 新增阶段 P4.5：T+30 自动确认 Cron | 配合「先 pending 后 confirmed」策略 | §四、§十 |
| 3 | 合并 P2 + P3 为 P2'（避免 middleware 文件冲突） | 实施可行性 | §十 |
| 4 | 所有金额字段改 `numeric(10, 2)` | 财务精度防浮点误差 | §三 |
| 5 | `referral_code` 创建后不可修改（DB 强制） | 防止老链接失效 | §三 |
| 6 | P1 阶段补全 7 张表的 RLS 策略明文 | 防数据泄露 | §三 |
| 7 | `sales_visits` 加去重逻辑（UNIQUE + 节流） | 防数据爆炸 | §三、§五 |
| 8 | 新增「订阅生命周期 → 佣金归属决策表」 | 边界情况明确化 | §四 |
| 9 | P6 工时改为 12-16h | 工时预估修正 | §十 |
| 10 | `agent.user_id NOT NULL` | 简化销售账号模型 | §三 |

**两个核心策略决策（v3 锁定）：**
- 归因策略：cookie 内首次锁定，30 天内不允许覆盖，cookie 过期后重新归因
- 佣金确认策略：**所有 commission 创建时均为 pending，T+30 天 cron 自动转 confirmed**（防退款）

---

## 一、KPI 体系定义

（与 v2 一致，未修改）

| KPI | 名称 | 触发条件 | 追踪方式 | 实施状态 |
|---|---|---|---|---|
| KPI-1 | 引流访问 | 用户通过销售推广链接到达网站 | cookie + sales_visits 表 | ✅ |
| KPI-2 | 注册转化 | 用户完成注册（创建账号） | auth.users + sales_referrals | ✅ |
| KPI-3 | 付费转化 | 用户完成订阅或积分包购买 | Stripe Webhook → sales_commissions | ✅ |
| KPI-4 | 线下服务 | 客户线下付费（如 10 万咨询费） | Admin 手动录入 | 🔒 保留 |

KPI 业绩目标可由 Admin 按销售个人设置或设全局默认值，详见 §七。

---

## 二、追踪链路设计

### 2.1 推广链接格式

```
https://koalaphd.com?ref=SALES_CODE&ch=CHANNEL_ID
```

参数说明同 v2：`ref`（必须）+ `ch`（可选）。预定义渠道值表见 v2 §2.1。

**[v3 修订] 渠道值统一小写 + 下划线分隔**（如 `wechat_article` 而非 `WechatArticle`），DB 端不做枚举限制（允许销售自定义渠道如 `ch=zhihu_post`），但在 API 层做长度限制（≤50 字符）和字符集校验（`^[a-z0-9_\-]+$`）。

### 2.2 归因规则（v3 锁定）

**首次访问：**
1. 用户打开带 `ref` 参数的链接
2. Next.js middleware 检测 URL 参数
3. 将 `ref` + `ch` + 时间戳 + landing_page 写入 cookie `koala_ref`（HttpOnly，30 天有效期，Domain=`.koalaphd.com`）
4. 同时调用 `/api/sales/track-visit` 写入 `sales_visits`（KPI-1）

**[v3 修订] cookie 必须设 `Domain=.koalaphd.com`**，确保博客子域和主域共享归因。

**归因冲突处理（v3 锁定）：**
- cookie 内首次锁定，30 天内**不允许覆盖**
- 用户清 cookie 或 30 天后重新归因
- 已知限制（写入文档）：同设备多用户场景下，B 用户在 A 用户访问后注册会被归属给 A 的销售

**注册归因（KPI-2）：**
1. 用户完成 Supabase auth 注册（含 OAuth）
2. 注册成功 callback 中读取 cookie `koala_ref`
3. 调用 `/api/sales/attribute` 写入 `sales_referrals`
4. 清除 cookie

**[v3 修订] OAuth 注册回调路径要单独埋点**：Google/Microsoft OAuth 回调走 `/auth/callback`，需在该路由也调用 attribute API。

**付费归因（KPI-3）：**
详见 §四「Webhook 与佣金计算」。

---

## 三、数据库 Schema（7 张表，v3 修订）

### 表 1: `sales_agents`

```sql
CREATE TABLE sales_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,  -- [v3] NOT NULL
  name text NOT NULL,
  phone text,
  email text,
  wechat_id text,
  referral_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX idx_sales_agents_referral_code ON sales_agents(referral_code);
CREATE INDEX idx_sales_agents_status ON sales_agents(status);

-- [v3 新增] 阻止修改 referral_code
CREATE OR REPLACE FUNCTION prevent_referral_code_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'referral_code cannot be modified after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_referral_code_change
  BEFORE UPDATE ON sales_agents
  FOR EACH ROW EXECUTE FUNCTION prevent_referral_code_change();
```

**[v3 RLS]：**
```sql
ALTER TABLE sales_agents ENABLE ROW LEVEL SECURITY;

-- 销售只能看自己的记录
CREATE POLICY sales_agents_self_read ON sales_agents FOR SELECT
  USING (user_id = auth.uid());

-- Admin/Super Admin 可读全部
CREATE POLICY sales_agents_admin_read ON sales_agents FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- 只有 Admin/Super Admin 能写
CREATE POLICY sales_agents_admin_write ON sales_agents FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
```

### 表 2: `sales_referrals`

```sql
CREATE TABLE sales_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES sales_agents(id),
  referred_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id),
  channel text NOT NULL DEFAULT 'unknown',
  source_url text,
  landing_page text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  first_subscription_at timestamptz,  -- 由 webhook 维护
  first_purchase_at timestamptz,       -- 由 webhook 维护
  total_revenue numeric(10, 2) NOT NULL DEFAULT 0,    -- [v3] numeric(10,2)
  total_commission numeric(10, 2) NOT NULL DEFAULT 0, -- [v3] numeric(10,2)
  total_refunded numeric(10, 2) NOT NULL DEFAULT 0,   -- [v3 新增] 累计退款额
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sales_referrals_agent_id ON sales_referrals(agent_id);
CREATE INDEX idx_sales_referrals_registered_at ON sales_referrals(registered_at);
CREATE INDEX idx_sales_referrals_channel ON sales_referrals(channel);
```

**注：** `first_subscription_at` / `first_purchase_at` 保留为冗余字段（webhook 写入），不改 view，因为 dashboard 查询频次高，aggregate 性能不够。webhook 内会保护「只在 NULL 时写入」。

**[v3 RLS]：**
```sql
ALTER TABLE sales_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY referrals_agent_read ON sales_referrals FOR SELECT
  USING (agent_id IN (SELECT id FROM sales_agents WHERE user_id = auth.uid()));

CREATE POLICY referrals_admin_all ON sales_referrals FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- 系统写入（service_role 走 webhook）不受 RLS 限制
```

### 表 3: `sales_commissions`（v3 修订）

```sql
CREATE TABLE sales_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES sales_agents(id),
  referral_id uuid NOT NULL REFERENCES sales_referrals(id),
  referred_user_id uuid NOT NULL REFERENCES auth.users(id),
  stripe_payment_id text NOT NULL,
  stripe_checkout_session_id text,
  stripe_invoice_id text,                 -- [v3 新增] 订阅类需要
  product_type text NOT NULL,
  product_name text NOT NULL,
  payment_amount numeric(10, 2) NOT NULL,        -- [v3] numeric(10,2)
  commission_rate numeric(5, 4) NOT NULL,        -- [v3] numeric(5,4) 支持 0.0000~1.0000
  commission_amount numeric(10, 2) NOT NULL,     -- [v3] numeric(10,2)
  refunded_amount numeric(10, 2) NOT NULL DEFAULT 0,  -- [v3 新增] 退款金额
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'paid_out', 'refunded')),  -- [v3] 加 refunded
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id),    -- NULL = 系统自动确认
  confirmation_method text,                       -- [v3 新增] 'auto_t30' / 'manual' / 'auto_recurring'
  paid_out_at timestamptz,
  paid_out_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  refund_event_id text,                          -- [v3 新增] 退款关联的 Stripe event ID
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sales_commissions_agent_id ON sales_commissions(agent_id);
CREATE INDEX idx_sales_commissions_status ON sales_commissions(status);
CREATE INDEX idx_sales_commissions_created_at ON sales_commissions(created_at);
CREATE UNIQUE INDEX idx_sales_commissions_stripe_payment ON sales_commissions(stripe_payment_id);

-- [v3 新增] T+30 cron 查询优化索引
CREATE INDEX idx_commissions_pending_aging
  ON sales_commissions(status, created_at)
  WHERE status = 'pending';
```

**[v3 RLS]：**
```sql
ALTER TABLE sales_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY commissions_agent_read ON sales_commissions FOR SELECT
  USING (agent_id IN (SELECT id FROM sales_agents WHERE user_id = auth.uid()));

CREATE POLICY commissions_admin_all ON sales_commissions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
```

### 表 4: `sales_commission_rates`

```sql
CREATE TABLE sales_commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text UNIQUE NOT NULL,
  product_name text NOT NULL,
  price_aud numeric(10, 2) NOT NULL,             -- [v3] numeric(10,2)
  commission_rate numeric(5, 4) NOT NULL DEFAULT 0.2000 CHECK (commission_rate >= 0 AND commission_rate <= 1),  -- [v3]
  is_recurring boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 初始数据（同 v2）
INSERT INTO sales_commission_rates (product_type, product_name, price_aud, commission_rate, is_recurring) VALUES
  ('credit_starter', '入门包 — 50 积分', 4.99, 0.2000, false),
  ('credit_standard', '标准包 — 120 积分', 9.99, 0.2000, false),
  ('credit_pro', '专业包 — 280 积分', 19.99, 0.2000, false),
  ('credit_flagship', '旗舰包 — 800 积分', 49.99, 0.2000, false),
  ('sub_starter', 'Starter 月度订阅', 19.90, 0.1500, true),
  ('sub_pro', 'Pro 月度订阅', 49.00, 0.1500, true),
  ('sub_elite', 'Elite 月度订阅', 99.00, 0.1500, true);
```

**[v3 RLS]：所有人可读（产品价格透明），仅 Admin 可写。**

### 表 5: `sales_visits`（v3 重大修订）

```sql
CREATE TABLE sales_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES sales_agents(id),
  channel text NOT NULL DEFAULT 'unknown',
  landing_page text,
  source_url text,
  visitor_fingerprint text NOT NULL,  -- [v3] NOT NULL（用 cookie 内 random UUID，非浏览器指纹，避免 GDPR/Privacy Act 问题）
  user_agent text,
  ip_hash text,
  hour_bucket timestamptz NOT NULL,   -- [v3 新增] date_trunc('hour', visited_at) 用于去重
  visited_at timestamptz DEFAULT now()
);

-- [v3 新增] 去重 UNIQUE 约束：同一访客在同一小时同一渠道只算一次
CREATE UNIQUE INDEX idx_visits_dedup
  ON sales_visits(agent_id, visitor_fingerprint, channel, hour_bucket);

CREATE INDEX idx_sales_visits_visited_at ON sales_visits(visited_at);
CREATE INDEX idx_sales_visits_agent_channel ON sales_visits(agent_id, channel);
```

**[v3 隐私说明]：** `visitor_fingerprint` 使用 cookie 中存储的随机 UUID（cookie 设置时生成，30 天有效），**不使用** canvas/audio/font 等浏览器指纹技术，避免 GDPR/澳洲 Privacy Act 合规问题。

**[v3 前端节流]：** sessionStorage 缓存 `koala_visit_logged` 标记，同 session 5 分钟内不重复发 API。

**[v3 RLS]：销售看自己的，Admin 看全部。**

### 表 6: `sales_kpi_targets`

（基本同 v2，金额字段改 numeric(10,2)）

```sql
CREATE TABLE sales_kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES sales_agents(id),  -- NULL = 全局默认
  period_type text NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  kpi_1_visits integer NOT NULL DEFAULT 0,
  kpi_2_registrations integer NOT NULL DEFAULT 0,
  kpi_3_payments integer NOT NULL DEFAULT 0,
  kpi_3_revenue numeric(10, 2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  effective_until date,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sales_kpi_targets_agent_id ON sales_kpi_targets(agent_id);
CREATE INDEX idx_sales_kpi_targets_effective ON sales_kpi_targets(effective_from, effective_until);
```

**[v3 RLS]：销售可读自己的目标，仅 Admin 可写。**

### 表 7: `sales_audit_logs`

（同 v2，无字段变更）

```sql
CREATE TABLE sales_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  actor_email text,
  actor_role text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sales_audit_logs_actor ON sales_audit_logs(actor_id);
CREATE INDEX idx_sales_audit_logs_action ON sales_audit_logs(action);
CREATE INDEX idx_sales_audit_logs_created_at ON sales_audit_logs(created_at);
CREATE INDEX idx_sales_audit_logs_target ON sales_audit_logs(target_type, target_id);
```

**[v3 新增 action 枚举]：**

| action | target_type | 说明 |
|---|---|---|
| commission_auto_confirmed | commission | Cron T+30 自动确认 |
| commission_refunded | commission | Stripe 退款触发 |
| subscription_cancelled | referral | 订阅取消 |
| referral_attribution_created | referral | 注册时归因写入 |

**[v3 RLS]：仅 Super Admin 可读。Admin 写入由 trigger 自动完成。**

```sql
ALTER TABLE sales_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_super_admin_read ON sales_audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- 写入通过 SECURITY DEFINER 函数完成，绕过 RLS
```

---

## 四、Webhook 与佣金计算（v3 重大修订）

### 4.1 Stripe 事件监听（v3 扩展）

| 事件 | v2 | v3 处理 |
|---|---|---|
| `checkout.session.completed` | ✅ | 一次性购买 → 创建 commission（status=pending） |
| `invoice.paid` | ✅ | 订阅续费 → 创建 commission（status=pending） |
| `customer.subscription.updated` | 已订阅 | 升降级处理（见 §4.5） |
| `customer.subscription.deleted` | 已订阅 | 写审计 + 阻止后续佣金 |
| **`charge.refunded`** | **❌ → ✅ [v3 新增]** | **找对应 commission → reject + 回滚 referral 累计** |
| **`charge.refund.updated`** | **❌ → ✅ [v3 新增]** | **部分退款处理** |
| **`invoice.payment_failed`** | **❌ → ✅ [v3 新增]** | **写审计，不创建 commission** |

### 4.2 佣金创建流程（v3 修订）

```
事件: checkout.session.completed 或 invoice.paid
  ↓
读取 metadata.supabase_user_id
  ↓
查 sales_referrals 是否有归属
  ↓ 有
查 sales_commission_rates 拿当前 rate
  ↓
计算: commission_amount = ROUND(payment_amount × commission_rate, 2)
  ↓
INSERT sales_commissions (status='pending', confirmation_method=NULL)
  ↓
UPDATE sales_referrals:
  - total_revenue += payment_amount
  - first_subscription_at = COALESCE(first_subscription_at, NOW())  -- 订阅类
  - first_purchase_at = COALESCE(first_purchase_at, NOW())  -- 一次性
  ↓
写 sales_audit_logs (action='commission_created', actor=system)
```

**[v3 关键变化]：** 所有 commission 创建时 **status='pending'**，不再区分一次性/订阅首月。

### 4.3 T+30 自动确认 Cron（v3 新增）

**部署方式：** Vercel Cron（`vercel.json` 配置）+ Next.js API Route

**`vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/auto-confirm-commissions",
    "schedule": "0 2 * * *"
  }]
}
```

每天 UTC 02:00 运行（澳洲东部时间约中午 12-13 点）。

**`app/api/cron/auto-confirm-commissions/route.ts` 逻辑：**

```
1. 校验 Authorization: Bearer ${CRON_SECRET}
2. 查询: status='pending' AND created_at < NOW() - INTERVAL '30 days'
3. 对每条记录:
   - 再次确认没有关联的退款（commission.refunded_amount = 0）
   - UPDATE status='confirmed', confirmed_at=NOW(), confirmation_method='auto_t30'
   - 累加 referral.total_commission
   - 写 audit_log (action='commission_auto_confirmed')
4. 返回统计: { confirmed_count, total_amount }
```

**索引保证：** `idx_commissions_pending_aging` 让这个查询高效。

### 4.4 退款处理（v3 新增）

```
事件: charge.refunded
  ↓
从 charge.payment_intent 找到对应 commission（stripe_payment_id）
  ↓
情况 A: commission.status = 'pending'
  → UPDATE status='rejected', rejection_reason='Stripe refund', refund_event_id=event.id
  → UPDATE referral.total_revenue -= refund_amount
  → 写 audit (action='commission_refunded')

情况 B: commission.status = 'confirmed' 但未发放（paid_out_at IS NULL）
  → UPDATE status='refunded', refunded_amount=refund_amount
  → UPDATE referral.total_commission -= commission_amount
  → UPDATE referral.total_refunded += refund_amount
  → 写 audit + 通知 Admin（佣金已确认但用户退款，需人工复核）

情况 C: commission.status = 'paid_out'（已发放）
  → 不修改记录，标记 refunded_amount，写紧急 audit
  → 通知 Admin 处理：从销售下月佣金扣除或要求退还
```

### 4.5 订阅生命周期 → 佣金归属决策表（v3 新增）

| 场景 | Stripe 事件 | 佣金处理 |
|---|---|---|
| 用户首次订阅 | `checkout.session.completed` | 按订阅产品 rate 创建 pending commission |
| 订阅自动续费 | `invoice.paid` | 创建新 pending commission（每月一笔）|
| 订阅升级（Starter→Pro）| `customer.subscription.updated` + `invoice.paid` (prorated) | invoice.paid 触发，按 prorated invoice line items 的产品判断 rate |
| 订阅降级（Pro→Starter）| `customer.subscription.updated`（无 invoice）| 不创建 commission，下一周期按新产品计 |
| 订阅取消（当期保留）| `customer.subscription.updated` (cancel_at_period_end) | 不影响现有 commission，写 audit |
| 订阅取消（立即终止 + 退款）| `customer.subscription.deleted` + `charge.refunded` | 走退款流程，见 §4.4 |
| 试用期转付费 | `invoice.paid`（首次 ≠ $0）| 按正常订阅创建 commission |
| 支付失败重试成功 | `invoice.paid` | 正常创建 commission（幂等性由 stripe_invoice_id 保证）|
| 支付失败最终失败 | `invoice.payment_failed` | 不创建 commission，写 audit |
| 优惠码导致 $0 invoice | `invoice.paid` (amount=0) | 不创建 commission（payment_amount=0）|

### 4.6 幂等性保证（v3 强化）

- `sales_commissions.stripe_payment_id` UNIQUE → 同一 PaymentIntent 不重复
- 订阅类还要看 `stripe_invoice_id`：每月 invoice 独立 ID，不会冲突
- Webhook 重试场景：先 SELECT 已存在记录，存在则跳过

---

## 五、API 端点设计（v3 修订）

### 5.1 前端归因 API

```
POST /api/sales/track-visit
Body: { ref, ch, landing_page, fingerprint, hour_bucket }
→ 校验 ref 存在且 active
→ INSERT sales_visits (ON CONFLICT DO NOTHING，依靠 idx_visits_dedup)
→ 返回 200

POST /api/sales/attribute
Body: { ref, ch, source_url, landing_page }
→ 用户注册成功后调用（含 OAuth 回调）
→ 校验 ref + 用户未归属
→ INSERT sales_referrals
→ 写 audit (action='referral_attribution_created')
→ 清除 cookie（client 端处理）
→ 返回 200
```

### 5.2 Cron API（v3 新增）

```
POST /api/cron/auto-confirm-commissions
Header: Authorization: Bearer ${CRON_SECRET}
→ 见 §4.3 逻辑
→ 返回 { confirmed_count, total_amount, errors }
```

### 5.3 销售后台 / Admin API

（结构同 v2 §5.2、§5.3，金额字段精度由 DB 保证）

---

## 六、销售后台 UI（同 v2 §六）

布局和组件设计与 v2 一致，**唯一修改**：

**[v3 修订] 「本周」明确定义为 ISO 8601 标准周（周一 00:00 - 周日 23:59，澳洲东部时区）**，UI 上加 tooltip 说明。

**[v3 修订] 达成率计算保护除零：**

```sql
-- ❌ 错误
SELECT current_value / target_value * 100 AS percent FROM kpi;

-- ✅ 正确
SELECT
  CASE WHEN target_value = 0 THEN NULL
       ELSE ROUND(current_value::numeric / target_value * 100, 1)
  END AS percent
FROM kpi;
```

UI 上目标为 0 时显示「未设置目标」而非「∞%」或 NaN。

---

## 七、Admin 后台 UI（同 v2 §七）

布局同 v2，**[v3 修订]：** 佣金审核页新增筛选项「pending（即将自动确认）」，显示距离 T+30 还剩多少天。

---

## 八、KPI-4 线下服务（保留设计，同 v2）

---

## 九、Stripe 产品配置（同 v2 §九）

---

## 十、实施阶段（v3 重排）

| 阶段 | 内容 | 预估 | 依赖 | 并行 |
|---|---|---|---|---|
| **P1** | DB 7 张表 + RLS 策略 + trigger（referral_code 锁定）+ 初始数据 | **~7h** ↑ | 无 | — |
| **P2'** | 前端归因 + 访问追踪（合并 v2 P2+P3，同一 middleware） | **~6h** | P1 | — |
| **P3** ~~删除~~ | 已合并入 P2' | — | — | — |
| **P4** | Webhook 佣金创建（pending 状态）+ 退款/订阅事件处理 + 审计日志 | **~6h** ↑ | P1 | 与 P2' 并行 |
| **P4.5** | T+30 Cron 自动确认 + Vercel Cron 配置 + Secret 管理 | **~2h** | P1+P4 | 与 P5/P6 并行 |
| **P5** | Admin: 销售 CRUD + 佣金比例配置 + KPI 目标设置 | ~5h | P1 | 与 P2'/P4 并行 |
| **P6** | 销售后台 Dashboard（完整页面） | **~14h** ↑ | P1+P2'+P4 | — |
| **P7** | Admin: 团队总览 + 渠道报表 + 佣金审核（含 T+30 倒计时显示） | ~6h | P1+P4+P5 | 与 P6 并行 |
| **P8** | 推广海报二维码 + 渠道链接生成器 | ~3h | P1+P2' | 与 P6/P7 并行 |

**总计约 49 小时**（v2 是 38-42h），P1 完成后多线并行，预估 **7-9 天**。

工时增加来源：
- P1 +2h：RLS 策略 + trigger 实现
- P4 +2h：退款 / 订阅取消事件
- P4.5 +2h：新增 cron 阶段
- P6 +6h：v2 工时严重低估

---

## 十一、OpenSpec 提案拆分建议

按 OpenSpec 流程，每个阶段建议拆为单独提案，避免单提案过大：

```
proposal-001: sales-tracking-database-schema  (P1)
proposal-002: sales-attribution-middleware    (P2')
proposal-003: stripe-commission-webhook       (P4)
proposal-004: t30-auto-confirm-cron           (P4.5)
proposal-005: admin-sales-management          (P5)
proposal-006: sales-dashboard-ui              (P6)
proposal-007: admin-team-overview-reports     (P7)
proposal-008: promotion-poster-qr-generator   (P8)
```

每个提案走完整流程：`/opsx:new` → `/opsx:ff` → `/opsx:apply` → `/opsx:verify` → `/opsx:archive`

---

## 十二、开发规则提醒（v3 补充）

1. **研究优先**：每个阶段开始前先 view 现有代码
2. **Claude Code 指令限制**：≤1,500 字符，最多 2-3 个功能或 5 个子任务
3. **OpenSpec 流程**：禁止跳过任何步骤
4. **遇 bug 先查 Sentry**：https://assa-investment-group.sentry.io/issues/errors-outages/?project=4511386990018560
5. **所有写操作必须有审计日志**：无例外
6. **commit 不自称修复**：必须验证后才标记完成
7. **金额计算必须用 ROUND 到 2 位小数**：`ROUND(amount * rate, 2)`
8. **Webhook 处理必须幂等**：先查再写
9. **Cron Secret 不入库**：通过 Vercel 环境变量 `CRON_SECRET` 管理
10. **Super Admin 邮箱**：renehee@hotmail.com + yangxianzeng2021@gmail.com

---

## 附录 A：环境变量清单（v3）

```bash
# 已有
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# [v3 新增]
CRON_SECRET=<随机 32 字节字符串>  # Vercel Cron 调用授权
```

---

## 附录 B：v3 vs v2 文件影响范围预估

| 模块 | 影响文件 | 工作量 |
|---|---|---|
| DB migration | `supabase/migrations/YYYYMMDD_sales_tracking.sql` | 1 个新文件 ~400 行 |
| Middleware | `middleware.ts`（已存在，需扩展） | +80 行 |
| Webhook | `app/api/webhooks/stripe/route.ts`（已存在，需扩展） | +200 行 |
| Cron | `app/api/cron/auto-confirm-commissions/route.ts` | 新文件 ~80 行 |
| Sales Dashboard | `app/koala/sales-dashboard/page.tsx` + 组件 | 新文件 ~1200 行 |
| Admin Pages | `app/koala/admin/sales/*` | 新文件 ~800 行 |
| API Routes | `app/api/sales/*` + `app/api/admin/sales/*` | ~15 个新文件 |

---

**v3 定稿。可作为 Claude Code 全部实施工作的唯一权威方案。**
