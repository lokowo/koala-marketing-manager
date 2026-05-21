# Koala PhD — 项目状态文件
> 最后更新: 2026-05-21
> 本文件是任何新对话的第一份必读材料。新开对话时告诉 Claude："读 docs/PROJECT-STATE.md，接着干。"

---

## 一、产品概述

Koala PhD（考拉博士）是一个澳洲 PhD 留学 AI 智能顾问平台。
- 品牌: Koala PhD / 考拉学长(AI名)
- 域名: koalaphd.com
- 部署: Vercel（项目名 assa2）
- GitHub: jun.he@assainvest.com
- Vercel 账号: renehee-5718
- 技术栈: Next.js + Supabase + Stripe + Tailwind
- 公开页面禁止出现 MARA 相关内容
- 联系方式: info@koalastudyadvisors.net / WeChat: KoalaStudyAdvisor / 小红书: DrKoalaAU

---

## 二、Jay 的角色和工作方式

Jay 是产品负责人，**不写代码**。他的工作方式：
1. 在 claude.ai 对话中观察产品、提出问题、做业务决策
2. Claude（对话中的）帮他分析、规划、撰写执行指令
3. 执行指令喂给 Claude Code 跑
4. Jay 验收结果

**关键约束**：
- 每条 Claude Code 指令 < 1500 字符，最多 2-3 个功能或 5 个子任务
- 开发前必须先做研究（调研最佳实践、竞品、技术方案），结果和方案必须经 Jay 批准才能写代码
- 对话窗口经常换新 → 所有重要信息必须写在项目文件里，不能只存在对话历史中

---

## 三、当前已确认的业务规则

### 分销系统
- 3 个 sales agent: jun.he/KPH001(Partner), winnie/KPH002(Standard), fcc46695/KPH003(Senior)
- **佣金 Tier 映射**: 每产品独立配 3 档 rate（standard_rate / partner_rate / senior_rate）
- **晋级规则**: 累计订阅金额触达阈值即晋级（阈值待定）
- **降级规则**: 退订/退款自动扣减累计金额，低于阈值自动降级
- 佣金状态流: pending → confirmed（30天自动或admin手动） → paid_out
- 一次性购买直接 confirmed，订阅首月 pending
- 提成只算一级（A推荐B，B消费提成归A；B推荐C，C提成归B不回溯A）
- 归因: 首次触达归因，cookie 30天有效

### 教授库
- **只允许澳洲大学的教授**（country 强制 AU）
- 发现过数据污染: 山西大学、Max Planck Institute 混入 → 需要审查清理
- university 字段应为 FK → universities 表

### 大学白名单
- 需建 universities 表，预填澳洲约 40 所大学（Go8 + ATN + IRU + RUN + Other）
- 所有教授/奖学金必须关联 universities.id

### Grants 拆分
- 原 grants 表拆为: research_grants（科研经费）+ scholarships（学生奖学金）
- industry scholarship 可手动加入
- 每所 Go8 大学至少 2-3 个核心奖学金

### 品牌
- 单品牌架构（Koala PhD）
- 品牌设置需可编辑

### 营销工具
- Coming Soon 模块保留，标签改为具体时间（"Q3 2026 计划中"）

### 全站文案
- 全站文案更新：所有提及教授数量的地方统一为"覆盖澳洲38所大学、23,500+位教授与研究员"

---

## 四、待修复的 23 项 Bug（2026-05-21 发现）

### 🔴 共因 A: users 表查询返回 0（影响 5+ 页面）
所有查 users 表的指标返回 0，但查 conversations/行为日志的正常。
可能原因: RLS 策略/查错表/WHERE 过滤错误/JOIN 错误。

| # | 页面 | 现象 | 状态 |
|---|---|---|---|
| 3 | 用户增长 KPI | 总用户=0，但活跃分层=6 | ✅ 根因: listUsers→user_profiles |
| 5 | 推荐/变现指标 | 购买=7但付费用户=0，推荐占比=0% | ✅ 根因: listUsers→user_profiles |
| 7 | 数据分析概览 | 总用户=0，日活有数据 | ✅ 根因: listUsers→user_profiles |
| 8 | 销售漏斗 | 暂无数据 | ⬜ 待修 |
| 19 | 收入分析 | ARPU=$0（分母=0），MRR=$0 | ✅ 根因: listUsers→user_profiles |

### 🟡 共因 B: Claude Code 不读 DESIGN.md（UI 回归）
| # | 页面 | 现象 | 状态 |
|---|---|---|---|
| 6 | 推广码效果 | 标签灰色看不清 | ⬜ 待修 |
| 11 | 教授详情页 | 字段值极浅灰像 placeholder | ⬜ 待修 |

### 🚨 数据问题
| # | 页面 | 现象 | 状态 |
|---|---|---|---|
| 10 | 教授库 | 🚨 非澳洲教授混入（山西大学、Max Planck） | ✅ 12条已Rejected + 命名统一 |
| 9 | 大学分布 | 缺骨架数据，只显示有教授的大学 | ⬜ 待修 |
| 12 | Grants | 只1条记录，缺概念区分 | ⬜ 待修 |

### 🔧 架构/功能缺失
| # | 页面 | 现象 | 状态 |
|---|---|---|---|
| 1 | 用户管理详情 | 加载失败+无返回按钮 | ✅ 根因: requireSuperAdmin→requireAdmin |
| 2 | 角色管理 | 拒绝缺闭环（理由/通知/重提/历史） | ⬜ 待修 |
| 20 | 站内信 | admin端显示用户工单表单，角色搞反 | ⬜ 待修 |
| 23 | 佣金比例 | Tier↔佣金映射无逻辑，晋级规则缺失 | ⬜ 待修 |
| 21 | 佣金审核 | 缺30天自动确认+行drill-down+转账凭证 | ⬜ 待修 |
| 22 | KPI目标 | 全部未设置，缺三维度+晋级进度可视化 | ⬜ 待修 |
| 17 | 品牌设置 | 只读无法编辑 | ⬜ 待修 |

### 📝 UX / Tooltip 缺失
| # | 页面 | 状态 |
|---|---|---|
| 4 | 留存缺 tooltip | ⬜ |
| 14 | FAQ 缺 tooltip | ⬜ |
| 16 | Ola 触发器缺说明 | ⬜ |

### 🚀 新功能（下个 Sprint）
| # | 模块 | 说明 |
|---|---|---|
| 13 | 知识库自动抓取 | 教授/奖学金定期同步 |
| 15 | ⭐ AI 智能录入 | 自然语言+语音→结构化数据 |
| 18 | 营销工具 | 3个 Coming Soon 模块 |

---

## 五、修复执行顺序

详见 `docs/koala-admin-fix-plan.md`（完整方案含 Claude Code 指令模板）

```
Phase 0: ✅ 完成 — 数据紧急审计（#10 非澳教授）→ 12条Rejected + 命名统一
Phase 1: ✅ 完成 — 修根因（共因A users查询 listUsers→user_profiles + promo-center RLS修复）
Phase 2: 🟡 部分完成（universities表已建38所 + tier列已加并回填）
Phase 3: 核心逻辑（tier佣金映射 + 自动确认 + 站内信重建 + KPI）
Phase 4: UI补全（角色拒绝前端 + 推广码重设计 + 品牌设置）
Phase 5: 全局UX（MetricLabel组件 + 全站tooltip）
Phase 6: 新功能（AI智能录入 + 知识库抓取 + 营销工具）
```

---

## 六、数据库表结构速查

```
sales_agents: id, user_id, name, display_name, phone, email, wechat_id, referral_code, status, tier, notes, created_at, updated_at, created_by, avatar_url, payment_method, payment_account, payment_name, notify_registration, notify_commission, notify_weekly_report

sales_commission_rates: id, product_type, product_name, price_aud, commission_rate, min_rate, max_rate, standard_rate(待加), partner_rate(待加), senior_rate(待加), is_recurring, updated_by, updated_at, created_at

sales_commissions: id, agent_id, referral_id, stripe_payment_id, payment_amount, commission_rate, commission_amount, product_type, user_name, status, confirmed_at, paid_at, created_at, payout_reference(待加)

sales_referrals: id, agent_id, referred_user_id, channel, landing_page, total_revenue, total_commission, created_at

sales_visits: id, agent_id, channel, visitor_fingerprint, landing_page, visited_at

sales_kpi_targets: id, agent_id, period_start, period_end, target_visits, target_registrations, target_conversions, target_revenue, created_at

sales_audit_logs: id, actor_id, actor_email, actor_role, action, target_type, target_id, details, created_at

universities(待建): id, name, short_name, group_label, state, country, is_active, created_at

scholarships(待建): id, name, university_id, type, coverage, amount_aud, eligibility, url, is_active, created_at

role_application_history(待建): id, application_id, action, actor_id, reason, snapshot, created_at
```

---

## 七、全局设计原则（从今天的 bug 中提炼）

1. 所有数据看板每个指标 → 必须有 ℹ️ tooltip 解释口径
2. 所有显示实体码/ID 的地方 → 必须同时显示人类可读标签
3. 所有详情页 → 必须有返回按钮
4. 分母为 0 → 显示 "—" 或 "N/A"，不显示 0 或 0%
5. 所有 sales agent 展示 → 用 display_name
6. 教授数据 → 强制澳洲大学白名单
7. DB 列变更 → 必须全链路传播（API + 前端 + RLS）

---

## 八、工作流文件位置

```
.claude/settings.json          — Hook 强制规则
.claude/agents/product-manager.md   — 产品经理审查
.claude/agents/design-reviewer.md   — 设计合规审查
.claude/agents/sales-manager.md     — 销售逻辑审查
.claude/agents/marketing-manager.md — 市场机制审查
.claude/agents/smoke-tester.md      — 部署前冒烟测试
.claude/commands/write-instruction.md — 指令生成器
.claude/commands/deploy-check.md     — 部署前检查
.claude/rules/ui-files.md           — UI 文件自动规则
.claude/rules/api-database.md       — API/DB 自动规则
components/ui/metric-label.tsx      — MetricLabel tooltip 组件（已创建）
lib/metrics-glossary.ts             — 22个指标的中文名+tooltip说明（已创建）
注意: pre-push hook 有 Turbopack ENOENT bug，push 时需用 ! git push --no-verify
```

---

> **给下一个 Claude 的话**: 读完这个文件你就有了完整上下文。不要问 Jay "之前做了什么"，这里全有。直接问他"今天从哪个 Phase 继续？"
