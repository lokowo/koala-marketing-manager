# Koala Admin 后台修复 — 完整执行方案
> 生成时间：2026-05-21 | 问题总数：23 项 | 预计总工时：3-4 天

---

## 一、23 项问题完整清单（按根因分组）

### 🔴 共因 A：users 表查询 bug（影响 5 个页面）
| # | 页面 | 现象 | 严重度 |
|---|---|---|---|
| 3 | 用户增长 KPI | 总用户=0，但活跃分层有 6 人 | 高 |
| 5 | 推荐计划/变现指标 | 购买次数=7，付费用户=0；推荐占比=0% | 高 |
| 7 | 数据分析概览 | 总用户=0，日活图表有数据 | 高 |
| 8 | 销售漏斗 | 暂无数据（可能同因） | 中 |
| 19 | 收入分析 | ARPU=$0（分母=0），MRR=$0 | 高 |

### 🟡 共因 B：Claude Code 不读 DESIGN.md（影响全站 UI）
| # | 页面 | 现象 | 严重度 |
|---|---|---|---|
| 6 | 推广码效果 | 标签灰色看不清 | 中 |
| 11 | 教授详情页 | 所有字段值极浅灰，像 placeholder | 高 |

### 🟡 共因 C：display_name 未被前端引用
| # | 页面 | 现象 |
|---|---|---|
| 6 | 推广码效果 | 显示密码般的 code 而非人名 |
| 21 | 佣金审核 | 显示 winnie452075233 而非显示名 |
| 22 | KPI 目标 | 同上 |

### 🚨 数据污染 / 数据不足
| # | 页面 | 问题 | 严重度 |
|---|---|---|---|
| 10 | 教授库 | 🚨 非澳洲教授混入（山西大学、Max Planck） | **极高** |
| 9 | 大学分布 | 缺骨架数据，只显示已有教授的大学 | 中 |
| 12 | Grants | 只有 1 条记录，缺概念区分（Grant vs Scholarship） | 高 |

### 🔧 架构 / 功能缺失
| # | 页面 | 问题 | 严重度 |
|---|---|---|---|
| 1 | 用户管理详情 | 加载失败 + 无返回按钮 | 中 |
| 2 | 角色管理 | 拒绝缺闭环（理由/通知/重提/历史） | 高 |
| 20 | 站内信 | admin 端显示的是用户工单提交表，角色搞反 | 高 |
| 23 | 佣金比例 | Tier↔佣金映射无逻辑，晋级规则完全缺失 | 高 |
| 21 | 佣金审核 | 缺 30 天自动确认 + 行 drill-down + 转账凭证 | 高 |
| 22 | KPI 目标 | 全部未设置，缺三维度定义 + 晋级进度可视化 | 高 |
| 17 | 品牌设置 | 只读无法编辑，缺多品牌考量 | 中 |

### 📝 UX / Tooltip 缺失
| # | 页面 | 问题 |
|---|---|---|
| 4 | 周留存队列 | 缺口径 tooltip |
| 5 | 推荐/变现指标 | 缺口径 tooltip |
| 8 | 销售漏斗 | 缺机制说明 + tooltip |
| 14 | FAQ 管理 | 缺匹配机制说明 + tooltip |
| 16 | Ola 触发器 | 缺使用说明 + 字段 tooltip |
| 19 | 收入分析 | MRR/ARPU 缺 tooltip + 缺 drill-down |

### 🚀 新功能 / 战略
| # | 模块 | 说明 |
|---|---|---|
| 13 | 知识库自动抓取 | 教授/奖学金/大学信息自动爬取 |
| 15 | ⭐ AI 智能录入 | FAQ/教授/奖学金自然语言+语音录入 |
| 18 | 营销工具 | 3 个 Coming Soon 模块规划 |

---

## 二、根因分析

### 共因 A：users 表查询返回 0（5+ 页面受影响）

**症状模式**：
- 凡是查 `users` 表计数的 → 返回 0
- 凡是查 `conversations` / 行为日志的 → 正常返回

**可能根因（按概率排序）**：
1. **RLS 策略**：admin 角色没有 `SELECT` 权限 on `auth.users` 或 `public.profiles`
2. **查错表**：API 查了 `auth.users`（Supabase 系统表，需 service_role key）但前端用的是 `anon` key
3. **过滤条件错误**：WHERE 子句有类似 `role='paid_user'` 或 `is_active=true` 或 `email_verified=true`
4. **JOIN 错误**：INNER JOIN 了某个空表（如 sales_agents），导致结果为空
5. **时间范围错误**：`created_at > NOW()` 之类的 typo

**诊断方法**：
```sql
-- Step 1: 直接查 users 表看有多少
SELECT count(*) FROM auth.users;
SELECT count(*) FROM public.profiles;  -- 如果有这张表

-- Step 2: 查 admin API 端点用的 SQL
-- 在代码里搜索 user-growth / dashboard-stats 等 API route
-- 找到 SELECT 语句，手动在 Supabase SQL Editor 跑

-- Step 3: 检查 RLS
SELECT * FROM pg_policies WHERE tablename = 'profiles';
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### 共因 B：Claude Code 不读 DESIGN.md

**根因**：CLAUDE.md 里没有强制规则要求 UI 任务必须先读 DESIGN.md
**修复**：在 CLAUDE.md 顶部加入强制规则（Phase 1A 执行）

### 共因 C：display_name 未被引用

**根因**：sales_agents.display_name 列昨天才加，前端所有引用 sales 数据的地方还在用 `name` 或 `user_id`
**修复**：全局搜索替换（Phase 4 统一执行）

---

## 三、执行前需要 Jay 拍板的决策（5 个）

### 决策 1：Tier ↔ 佣金映射方案 ✅ 已确认
- **方案**：每产品独立配 3 档 rate（standard_rate / partner_rate / senior_rate）
- **UI**：滑杆设兜底基准，自动算三档比例+金额，可展开高级设置独立微调
- **数据库**：sales_commission_rates 加 3 列

### 决策 2：晋级阈值
- Standard → Partner：累计订阅金额 ≥ $____？连续 __ 个月达 KPI 3？
- Partner → Senior：累计订阅金额 ≥ $____？连续 __ 个月达 KPI 3？
- 降级保护期：连续 __ 个月未达标 50% → 降级？

### 决策 3：Grants 拆不拆表
- **拆**：research_grants + scholarships（概念清晰，长期正确）
- **不拆**：在现有 grants 表加 type 字段区分（快但脏）
- **建议**：拆。这两个概念面向不同用户、不同流程。

### 决策 4：品牌架构
- **单品牌**：Koala PhD 就一个，品牌设置做成可编辑 singleton
- **多品牌**：未来可能有多个子品牌，需要 brands 表支持切换
- **建议**：短期 singleton，预留 brand_id 字段，不阻塞

### 决策 5：营销工具 Coming Soon
- 保留（给用户期望）还是去掉（避免空壳感）？
- 如果保留，哪些优先开发？

---

## 四、分阶段执行计划

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
数据审计    修根因      数据架构    核心逻辑    UI补全      UX统一      新功能
(30min)    (2-3h)     (3-4h)     (4-5h)     (4-5h)     (2-3h)     (下个sprint)

可并行：Phase 2 的数据库改动 可以和 Phase 1 的前端修复并行
可并行：Phase 4 的多个 UI 任务可以 2-3 窗口并行跑
```

---

### Phase 0：数据紧急审计（30 分钟）— 修 #10

**目标**：确认非澳洲教授污染范围 + 紧急处理

**在 Supabase SQL Editor 手动执行：**

```sql
-- 0-1: 查污染范围
SELECT
  COALESCE(country, '(NULL)') AS country,
  COUNT(*) AS cnt
FROM professors
GROUP BY country
ORDER BY cnt DESC;

-- 0-2: 列出所有非澳洲教授
SELECT id, name, university, country, created_at
FROM professors
WHERE country IS NULL
   OR LOWER(country) NOT IN ('australia', 'au', 'aus')
ORDER BY created_at DESC;

-- 0-3: 检查 university 字段是 FK 还是 free text
SELECT DISTINCT university FROM professors ORDER BY university;

-- 0-4: 软删除非澳洲教授（确认污染后执行）
UPDATE professors
SET is_active = false, notes = CONCAT(COALESCE(notes,''), ' [AUTO-DEACTIVATED: non-AU]')
WHERE country IS NULL
   OR LOWER(country) NOT IN ('australia', 'au', 'aus');
```

**决策点**：看到结果后决定是否执行 0-4。

---

### Phase 1：修复根因（2-3 小时）— 修 #3,5,7,8,19 + #6,11 + #1

#### Claude Code 指令 1A：强化 CLAUDE.md（防止共因 B 再发）

```
读取当前的 CLAUDE.md 文件。在文件最顶部（第一行之前）插入以下强制规则块：

## 🚨 UI 开发强制规则（不可跳过）
1. 任何涉及 UI/样式/组件的任务，开工前必须先读 docs/DESIGN.md
2. 在你的 plan 中必须引用 DESIGN.md 中至少 3 条具体规则（颜色变量、字号、间距、组件选型）
3. 所有表单字段的值必须使用 DESIGN.md 中定义的 text-primary 颜色，禁止使用 placeholder 色
4. 所有数据看板的每个指标必须有 ℹ️ tooltip 解释口径
5. 所有显示 sales agent 的地方必须用 display_name，不用 user_id 或原始 name
6. 所有显示 code/ID 的地方必须同时显示人类可读标签

不要修改 CLAUDE.md 的其他内容，只在顶部插入。
```

#### Claude Code 指令 1B：诊断共因 A — users 查询 bug

```
我们有一个跨多个 admin 页面的 bug：所有查 users 表的指标都返回 0，但查 conversations/行为日志的指标正常。

请执行以下诊断步骤：

1. 搜索 app/api/admin/ 目录下所有包含 "user" 或 "count" 或 "总用户" 的 API route 文件
2. 找到以下页面的数据查询逻辑：
   - 用户增长页（user-growth 相关）
   - 数据分析页（analytics 相关）
   - 收入分析页（revenue 相关）
   - 推荐计划/变现指标
3. 对比查 users 的 SQL 和查 conversations 的 SQL，找出差异
4. 重点检查：RLS 策略、WHERE 条件、JOIN 类型、使用的 key 类型（anon vs service_role）
5. 输出诊断报告：列出每个 API route 的 SQL 语句 + 问题所在

不要修改代码，先诊断输出报告让我确认。
```

#### Claude Code 指令 1C：修复共因 A（在 1B 诊断确认后执行）

```
根据诊断结果修复 users 查询 bug。

修复要求：
1. 确保所有 admin API 使用 service_role key 查询（绕过 RLS）
2. 或：修复 RLS 策略，给 admin 角色加 SELECT 权限
3. 移除任何不合理的 WHERE 过滤条件
4. 确保 ARPU 计算在分母=0 时显示 "N/A" 而非 $0.00
5. 确保推荐占比在分母=0 时显示 "—" 而非 0%

修复后在终端用 curl 测试每个修改过的 API endpoint，确认返回非零数据。
影响的页面：用户增长、数据分析、收入分析、推荐计划/变现指标。
```

#### Claude Code 指令 1D：修复 #1 用户管理详情页

```
修复 Admin 用户管理详情页的两个问题：

1. 加载失败 bug：
   - 路径：Admin → 用户与增长 → 用户管理 → 点击具体用户
   - 检查该页面的 API 调用，找出 "加载失败" 的原因并修复
   - 可能是 API route 不存在、参数错误、或 RLS 问题

2. 缺少返回按钮：
   - 在用户详情页顶部加一个返回按钮（← 返回用户列表）
   - 使用 router.back() 或 router.push('/admin/users')
   - 按 DESIGN.md 的样式规范添加

先读 docs/DESIGN.md 获取样式规范。
```

---

### Phase 2：数据架构（3-4 小时）— 修 #9,10,12,2

#### Claude Code 指令 2A：创建 universities 表 + 种子数据

```
创建 universities 表并种入澳洲所有大学。

1. 创建 migration：
CREATE TABLE universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  group_label text, -- 'Go8', 'ATN', 'IRU', 'RUN', 'Other'
  state text, -- 'NSW', 'VIC', 'QLD' 等
  country text NOT NULL DEFAULT 'AU',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_universities_name ON universities(name);

2. 种入以下大学（约 40 所）：
Go8: University of Melbourne, University of Sydney, ANU, UNSW, Monash, UWA, University of Adelaide, University of Queensland
ATN: UTS, QUT, RMIT, Curtin, Deakin
IRU: Griffith, La Trobe, Murdoch, James Cook, Flinders, Charles Darwin
RUN: Western Sydney, Newcastle, Southern Cross, CQUniversity, Federation, UNE, USC, USQ
Other: Macquarie, Wollongong, Tasmania, Edith Cowan, ACU, Victoria, Canberra, Charles Sturt, Bond, Torrens, Notre Dame, Swinburne

3. 不要修改 professors 表（后续 Phase 单独处理）。
```

#### Claude Code 指令 2B：教授表加 university FK + country 强制约束

```
修改 professors 表，增加数据完整性约束：

1. 添加 university_id 列：
ALTER TABLE professors ADD COLUMN university_id uuid REFERENCES universities(id);

2. 回填现有数据（根据 professors.university 文本匹配 universities.name）：
UPDATE professors p
SET university_id = u.id
FROM universities u
WHERE LOWER(p.university) LIKE '%' || LOWER(u.short_name) || '%'
   OR LOWER(p.university) LIKE '%' || LOWER(u.name) || '%';

3. 检查 country 列，确保有 CHECK 约束：
ALTER TABLE professors ADD CONSTRAINT professors_country_au
  CHECK (country IN ('Australia', 'AU', 'AUS') OR is_active = false);

4. 输出：未能匹配 university_id 的 professors 列表（需要人工处理）。
```

#### Claude Code 指令 2C：Grants 拆表（需要决策 3 确认后执行）

```
将现有 grants 表拆分为 research_grants + scholarships。

1. 创建 scholarships 表：
CREATE TABLE scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  university_id uuid REFERENCES universities(id),
  type text NOT NULL, -- 'federal', 'university', 'faculty', 'external'
  coverage text, -- 'tuition', 'stipend', 'tuition+stipend', 'full'
  amount_aud numeric,
  eligibility text, -- 自由文本描述申请条件
  url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

2. 种入核心奖学金数据：
- Federal: RTP (Research Training Program), AAS (Australia Awards)
- 每所 Go8 大学至少 2-3 个主力奖学金
- 其他大学至少 1 个

3. 重命名现有 grants 表为 research_grants，加 university_id FK。

4. 更新 admin 前端路由：原 /admin/grants → 拆为 /admin/research-grants 和 /admin/scholarships。
```

#### Claude Code 指令 2D：角色拒绝闭环 — 数据库层

```
为角色管理的拒绝/重提闭环创建数据库支持：

1. 检查现有角色申请相关的表（可能是 role_applications 或 users 表上的字段）。

2. 创建或修改表，确保包含：
- status: 'pending' | 'approved' | 'rejected' | 'resubmitted'
- rejection_reason: text（admin 拒绝时必填）
- rejected_at: timestamptz
- rejected_by: uuid（admin user_id）
- submission_count: integer DEFAULT 1

3. 创建 role_application_history 表：
CREATE TABLE role_application_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  action text NOT NULL, -- 'submitted','approved','rejected','resubmitted'
  actor_id uuid,
  reason text,
  snapshot jsonb, -- 当次提交的完整资料快照
  created_at timestamptz DEFAULT now()
);

4. 不做前端，只做数据库 migration。
```

---

### Phase 3：核心逻辑实现（4-5 小时）— 修 #23,21,22,20

#### Claude Code 指令 3A-1：Tier ↔ 佣金映射 — 后端逻辑

```
实现 sales agent tier 与佣金比例的映射逻辑。

1. 数据库改动：
   sales_commission_rates 表新增 3 列：
   ALTER TABLE sales_commission_rates
     ADD COLUMN standard_rate numeric,
     ADD COLUMN partner_rate numeric,
     ADD COLUMN senior_rate numeric;
   
   初始值回填：standard_rate=min_rate, senior_rate=max_rate,
   partner_rate=ROUND((min_rate+max_rate)/2, 4)

2. 创建 lib/sales/get-commission-rate.ts：
   export function getCommissionRate(product, tier): number
   - Standard → product.standard_rate
   - Partner → product.partner_rate
   - Senior → product.senior_rate
   - 兜底（tier 为空或未知）→ product.standard_rate

3. 修改 Stripe webhook（app/api/webhooks/stripe/route.ts）：
   佣金计算改为调用 getCommissionRate(product, agent.tier)
   不再用固定的 commission_rate 字段

4. 更新 API：PUT /api/admin/sales/commission-rates/:id
   接收 { standard_rate, partner_rate, senior_rate }
   写入 sales_audit_logs
```

#### Claude Code 指令 3A-2：Tier ↔ 佣金映射 — 前端交互设计

```
重做 admin 佣金比例配置页面的产品卡片交互。

每个产品卡片的新布局：
┌─────────────────────────────────┐
│ 订阅 - 精英  🔄订阅  月度订阅    │
│ $29.99                          │
│                                 │
│ 兜底比例（滑杆）: ████████░░ 20% │
│ 范围 1% — 40%                   │
│                                 │
│ ── 各等级实际比例 ──             │
│ 🥉 Standard   18%    = $5.40   │ ← 浅色线
│ 🥈 Partner     22%    = $6.60   │ ← 中色线
│ 🥇 Senior      25%    = $7.50   │ ← 深色/金色线
│                                 │
│ [高级设置 ▼]                     │
│  可单独微调每个等级的比例          │
│  （覆盖自动计算值）               │
└─────────────────────────────────┘

交互逻辑：
1. 滑杆拖动 → 自动计算三个等级的比例：
   - Standard = 滑杆值 - offset（如 -2%）
   - Partner = 滑杆值
   - Senior = 滑杆值 + offset（如 +3%）
   - offset 可配置，初始默认：Standard=-2%, Senior=+3%
   - 三个比例都不能超出 min_rate/max_rate 范围

2. 每根线实时显示：比例 % + 对应佣金金额 $X.XX
3. "高级设置"展开后可以独立调整每个等级（覆盖自动计算）
4. 保存按钮 → 调用 API 保存三个 rate

视觉要求：
- 三根线用不同颜色区分（如 Standard=灰, Partner=蓝, Senior=金）
- 滑杆使用 DESIGN.md 的 Slider 组件规范
- 金额实时计算，用绿色高亮显示

先读 docs/DESIGN.md 获取样式规范。
```

#### Claude Code 指令 3B：佣金自动确认 + 审核增强

```
增强佣金审核功能，包含 3 个改动：

1. 30 天自动确认逻辑：
   - 创建 app/api/cron/auto-confirm-commissions/route.ts
   - 逻辑：UPDATE sales_commissions SET status='confirmed', confirmed_at=NOW()
     WHERE status='pending' AND created_at < NOW() - INTERVAL '30 days'
   - 写入 audit log

2. 佣金行 drill-down：
   - 点击佣金审核列表中的一行 → 展开详情面板（或跳转详情页）
   - 显示：订单详情（Stripe ID、支付时间、退款状态）
   - 显示：用户详情（注册时间、推荐来源）
   - 显示：销售详情（agent 信息、累计佣金、当前 tier）

3. 标记已发放时增加转账凭证：
   - 点击"批量标记已发放"弹出确认框
   - 必填：转账流水号或截图上传
   - 保存到 sales_commissions.payout_reference 字段（需加列）
```

#### Claude Code 指令 3C：站内信 admin 重建

```
重建 admin 站内信页面，当前显示的是用户工单表单（角色搞反了）。

Admin 站内信应该包含：

Tab 1 - 收件箱（用户工单管理）：
- 工单列表：用户名 | 类型 | 标题摘要 | 状态(待处理/处理中/已解决) | 时间
- 筛选：按类型、状态、时间
- 点击工单 → 查看详情 + 回复
- 批量操作：标记已读、归档

Tab 2 - 发送通知：
- 发送对象：单个用户（搜索选择）/ 用户群组（全部/免费用户/付费用户）
- 消息内容：标题 + 正文（富文本）
- 预览 + 发送

Tab 3 - 通知模板：
- 预设模板列表（欢迎信、续费提醒、角色审核结果等）
- 新增/编辑/删除模板

移除现有的"新建工单"表单（那是用户端功能）。
先读 docs/DESIGN.md 获取样式规范。
```

#### Claude Code 指令 3D：KPI 三维度设置 + 进度可视化

```
完善 KPI 目标页面，实现三维度设置和进度可视化。

1. KPI 设置功能：
   - 点击 agent 卡片 → 弹出 KPI 设置表单
   - 三个维度：KPI 1 扫码人数(target_visits)、KPI 2 注册人数(target_registrations)、KPI 3 订阅人数(target_conversions)
   - 加一个"批量设置"按钮：一键给所有 agent 设统一目标
   - 保存到 sales_kpi_targets 表

2. 卡片展示改造：
   - 每个 agent 卡片显示：头像 + display_name + tier 标签
   - 三个 KPI 进度条（当前值/目标值 + 百分比）
   - "距离晋级还差 $X 订阅收入" 提示
   - 本月累计佣金

3. 使用 display_name 替代原始 user_id/name。

先读 docs/DESIGN.md 获取样式规范。
```

---

### Phase 4：UI 功能补全（4-5 小时）— 修 #2,6,17

#### Claude Code 指令 4A：角色拒绝闭环 — 前端

```
基于 Phase 2D 的数据库改动，实现角色管理拒绝闭环的前端：

1. Admin 拒绝操作：
   - 角色管理列表的"已拒绝"Tab 里，每行加"查看详情"按钮
   - 拒绝操作弹窗：必填拒绝理由（textarea + 常用理由模板下拉）
   - 提交后：更新状态 + 写入 role_application_history + 发站内信通知用户

2. 用户端重提交：
   - 用户"我的申请"页面能看到：当前状态 + 拒绝理由 + 修改资料入口
   - 修改后点击"重新提交" → status 改为 resubmitted → admin 重新审核
   - submission_count +1

先读 docs/DESIGN.md 获取样式规范。
```

#### Claude Code 指令 4B：推广码效果重设计

```
重新设计推广码效果 Top 10 图表（当前在用户增长页底部）。

改动：
1. 将"推广码效果"拆分为两个图表：
   - "Sales 推广码 Top 10"（关联 sales_agents 的 referral_code）
   - "用户分享码 Top 10"（非 sales 的普通用户分享码）

2. 每行展示：
   - 主标签 = 持有人姓名（sales 用 display_name，用户用昵称）
   - 副标签 = code（小字、低饱和度）
   - 数据 = 完整漏斗（扫码 → 注册 → 付费 → 收入）而非只有扫码量

3. 修复字体对比度：标签颜色使用 DESIGN.md 中的 text-primary 变量

4. 加 ℹ️ tooltip 解释口径

先读 docs/DESIGN.md 获取样式规范。
```

#### Claude Code 指令 4C：品牌设置可编辑

```
将 Admin 系统设置 → 品牌设置从只读改为可编辑。

1. 当前 4 个字段改为可编辑表单：
   - 品牌名称、AI 名称、域名、微信
   - 每个字段旁加编辑图标，点击变为 input

2. 扩展字段（加到表单底部）：
   - 邮箱、客服电话、小红书号、Logo URL、主色调

3. 保存按钮 → PATCH /api/admin/brand-settings
   - 数据库：如果 brand_settings 表不存在，创建为 singleton 表（只有 1 行）
   - 加 brand_id 字段预留多品牌扩展

4. 保存成功显示 toast 提示

先读 docs/DESIGN.md 获取样式规范。
```

---

### Phase 5：全局 UX 统一（2-3 小时）— 修 #4,5,8,14,16,19 + 全局 tooltip

#### Claude Code 指令 5A：创建 MetricLabel 组件 + 指标词典

```
创建全局通用的指标说明组件和指标词典。

1. 创建 components/ui/metric-label.tsx：
   - Props: label (string), tooltip (string), className? (string)
   - 渲染：label 文本 + ℹ️ 图标，hover 显示 tooltip
   - 使用 DESIGN.md 的 Tooltip 组件规范

2. 创建 lib/metrics-glossary.ts：
   统一管理所有指标的中文名 + tooltip 说明，导出为 object。
   包含以下指标（每个都要有清晰的口径说明）：

   用户增长页：总用户、30天新增、30天对话、30天套磁、深度用户、活跃用户、轻度用户、推荐人、被推荐用户、推荐占比、积分消耗、购买次数、付费用户、积分发放
   周留存：注册周、新增、次周留存、留存率
   数据分析：日活跃度（含 AI 对话 vs 套磁信说明）
   销售漏斗：访问、注册、对话、套磁、付费（每一层的定义）
   收入分析：本月收入、MRR、本月交易、ARPU、订阅分布

先读 docs/DESIGN.md 获取组件样式规范。
```

#### Claude Code 指令 5B：全站应用 MetricLabel + tooltip

```
将 Phase 5A 创建的 MetricLabel 组件应用到以下所有 admin 页面：

1. 用户增长页（/admin/user-growth）：
   - 顶部 4 个 KPI 卡片的标题
   - 用户活跃分层图例
   - 推荐计划 + 变现指标的每个数字
   - 周留存队列的表头

2. 数据分析页（/admin/analytics）：
   - 顶部 4 个 KPI 卡片
   - 日活跃度图例

3. 收入分析页（/admin/revenue）：
   - 顶部 4 个 KPI 卡片（MRR、ARPU 必须有说明）
   - 订阅分布标题
   - 收入概览的每行

4. FAQ 管理页：页面顶部加机制说明卡片（折叠式）
5. Ola 触发器页：每个列头加 tooltip + 页面顶部加机制说明

从 lib/metrics-glossary.ts 取文案，不要硬编码。
```

#### Claude Code 指令 5C：收入分析 drill-down

```
为收入分析页的 KPI 卡片添加点击 drill-down 功能：

1. 点击"本月收入 $360" → 展开/跳转交易流水列表
   - 表格：时间、用户、产品、金额、支付方式、状态
   - 支持排序和筛选

2. 点击"本月交易 8" → 同上列表（不同默认排序）

3. 点击"MRR $0" → 跳转订阅用户列表
   - 如果无数据显示空状态 + 说明"当前无活跃订阅"

4. 点击"ARPU $0/$N/A" → 跳转用户-收入分布图

实现方式：卡片加 cursor-pointer + onClick → 展开下方 detail panel。
先读 docs/DESIGN.md 获取样式规范。
```

---

### Phase 6：新功能规划（下个 Sprint）— #13,15,18

这三项不在本轮 bug 修复范围，但需要立项：

#### #15 AI 智能录入（战略级）
- FAQ：admin 自然语言/语音输入 → AI 生成结构化 FAQ
- 教授：贴 Google Scholar URL → AI 填充所有字段
- 奖学金：贴大学奖学金页面 → AI 结构化提取
- 通用 pattern：`<SmartInput>` 组件 + Whisper/Web Speech API
- 预计工时：1-2 周

#### #13 知识库自动抓取
- 教授信息：Google Scholar / Semantic Scholar 增量同步
- 奖学金：各大学官网定期爬取
- 强制约束：country='AU' + university IN whitelist
- 技术方案：cron + Playwright + LLM 结构化抽取
- 预计工时：2-3 周

#### #18 营销工具
- 活动管理：中等优先，1 周
- 内容营销：低优先，与 FAQ 部分重叠
- 数据洞察：低优先，与现有数据分析页重叠，建议合并
- 建议：短期去掉 Coming Soon 标签或改为"即将推出 — Q3 2026"

---

## 五、并行执行调度表

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ 时间段        │ 执行内容                                              │
├──────────────┼──────────────────────────────────────────────────────┤
│ Day 1 上午    │ Phase 0: Supabase SQL 审计（Jay 手动）                  │
│              │ Phase 1A: CLAUDE.md 强化                              │
│              │ Phase 1B: 诊断共因 A                                   │
├──────────────┼──────────────────────────────────────────────────────┤
│ Day 1 下午    │ Phase 1C: 修复共因 A（窗口 1）                          │
│              │ Phase 1D: 修复用户管理详情（窗口 2）                      │
│              │ Phase 2A: 创建 universities 表（窗口 3）                 │
├──────────────┼──────────────────────────────────────────────────────┤
│ Day 2 上午    │ Phase 2B: 教授 FK + country 约束（窗口 1）               │
│              │ Phase 2C: Grants 拆表（窗口 2，需决策 3 确认）             │
│              │ Phase 2D: 角色拒绝数据库（窗口 3）                       │
├──────────────┼──────────────────────────────────────────────────────┤
│ Day 2 下午    │ Phase 3A: Tier 佣金映射（窗口 1，需决策 1&2 确认）         │
│              │ Phase 3B: 佣金自动确认 + 审核增强（窗口 2）               │
│              │ Phase 3C: 站内信 admin 重建（窗口 3）                    │
├──────────────┼──────────────────────────────────────────────────────┤
│ Day 3 上午    │ Phase 3D: KPI 可视化（窗口 1）                          │
│              │ Phase 4A: 角色拒绝前端（窗口 2）                         │
│              │ Phase 4B: 推广码重设计（窗口 3）                         │
├──────────────┼──────────────────────────────────────────────────────┤
│ Day 3 下午    │ Phase 4C: 品牌设置可编辑（窗口 1）                       │
│              │ Phase 5A: MetricLabel + 词典（窗口 2）                   │
│              │ Phase 5B: 全站应用 tooltip（窗口 3）                     │
├──────────────┼──────────────────────────────────────────────────────┤
│ Day 4 上午    │ Phase 5C: 收入 drill-down（窗口 1）                     │
│              │ 全站回归测试（窗口 2-3）                                 │
│              │ 验收 + 部署                                            │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

## 六、验收 Checklist（部署前必须全部通过）

### 数据层
- [ ] 非澳洲教授已软删除，professors 表有 country CHECK 约束
- [ ] universities 表已创建，40+ 所澳洲大学已种入
- [ ] scholarships 表已创建，核心奖学金已种入
- [ ] role_application_history 表已创建
- [ ] sales_commissions 表有 payout_reference 列

### 共因 A 修复验证
- [ ] 用户增长页：总用户 ≠ 0
- [ ] 数据分析页：总用户 ≠ 0
- [ ] 收入分析页：ARPU 显示合理数值或 "N/A"
- [ ] 推荐计划：推荐占比显示合理数值或 "—"
- [ ] 变现指标：付费用户 ≠ 0（如果有交易数据）

### 共因 B 修复验证
- [ ] 教授详情页：所有字段值清晰可读（非 placeholder 色）
- [ ] 推广码标签：清晰可读
- [ ] CLAUDE.md 顶部有 UI 强制规则

### 功能验证
- [ ] 用户管理：详情页可正常加载 + 有返回按钮
- [ ] 角色管理：拒绝弹窗可填理由 + 提交后发通知
- [ ] 站内信：admin 看到的是工单收件箱 + 发送通知，不是提交表单
- [ ] 佣金比例：每个产品显示 3 档 tier 比例
- [ ] 佣金审核：点击行可看详情 + 标记发放需填转账凭证
- [ ] KPI 目标：可设置三维度 + 显示进度条 + 晋级差距
- [ ] 品牌设置：所有字段可编辑 + 保存成功

### UX 验证
- [ ] 所有数据看板指标旁有 ℹ️ tooltip
- [ ] 所有 sales agent 显示 display_name
- [ ] 所有 code/ID 旁有人类可读标签
- [ ] FAQ 管理页有机制说明
- [ ] Ola 触发器页有使用说明

### display_name 统一验证
- [ ] 佣金审核列表
- [ ] KPI 目标卡片
- [ ] 推广码效果图表
- [ ] 分销总览排行榜

---

## 七、风险提示

| 风险 | 影响 | 缓解 |
|---|---|---|
| 共因 A 的根因比预期复杂（如涉及 Supabase RLS 全局策略） | 修复时间翻倍 | Phase 1B 先诊断不改代码，确认后再动 |
| Grants 拆表影响现有 admin 页面 | 页面白屏 | 拆表后立刻更新前端路由 + API |
| professors 加 FK 约束导致现有脏数据报错 | Migration 失败 | 先跑 0-4 清理脏数据，再加约束 |
| Claude Code 仍然不读 DESIGN.md | UI 再次翻车 | 每条指令开头加"先读 docs/DESIGN.md" |
| 并行执行产生冲突（如两个窗口改同一文件） | Git 冲突 | 按模块拆分，同一文件不并行 |
