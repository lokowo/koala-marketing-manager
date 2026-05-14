## ADDED Requirements

### Requirement: Layer 1 survey overview panel
The analytics page SHALL display a cross-survey overview panel when no query params are present and user is super_admin or admin.

The panel SHALL include:
- Top summary cards: total surveys (active/ended), total valid responses, total registrations, active sales count (super_admin only)
- Table with columns: 问卷名称, 状态, 总扫码, 总填写, 有效问卷, 无效问卷, 完成率, 注册转化, 参与Sales数 (super_admin only), 操作
- 状态 badge: 进行中 (green) / 已结束 (gray)
- 操作 column: "详情" button that navigates to layer 2 (super_admin) or analytics charts (admin)

#### Scenario: Super admin sees full overview
- **WHEN** super_admin navigates to `/dashboard/koala/surveys/analytics`
- **THEN** they see summary cards (including active sales count) and survey table with Sales count column and detail buttons

#### Scenario: Admin sees limited overview
- **WHEN** admin navigates to `/dashboard/koala/surveys/analytics`
- **THEN** they see summary cards (without active sales count) and survey table without Sales count column; detail buttons link to existing per-survey analytics charts

### Requirement: Layer 2 sales performance breakdown
When `?survey=xxx` is present and user is super_admin, the page SHALL display a sales breakdown panel.

The panel SHALL include:
- Breadcrumb: 问卷总览 > {问卷名称}
- Sales table: #, Sales名称, 总扫码, 有效问卷, 无效, 注册, 转化率, 最近活跃, 详情
- Expandable daily breakdown per Sales (last 14 days)
- Activity indicators: ✅ (active), ⚠️ (warning), 🔴 (inactive)

#### Scenario: Super admin views sales breakdown
- **WHEN** super_admin clicks "详情" on a survey row
- **THEN** page navigates to `?survey=xxx` and shows per-Sales breakdown table

#### Scenario: Sales row expanded for daily detail
- **WHEN** super_admin clicks expand arrow on a Sales row
- **THEN** a nested table appears showing daily breakdown with activity status indicators

#### Scenario: No-activity days highlighted
- **WHEN** a Sales user has zero responses and zero follow-ups on a given day
- **THEN** that day's row shows 🔴 indicator and "未工作" label

#### Scenario: Warning days highlighted
- **WHEN** a Sales user has new responses but zero follow-up actions on a given day
- **THEN** that day's row shows ⚠️ indicator and "无操作" label

### Requirement: Layer 3 client detail list
When `?survey=xxx&sales=yyy` is present and user is super_admin, the page SHALL display a client detail panel.

The panel SHALL include:
- Breadcrumb: 问卷总览 > {问卷名称} > {Sales名称}
- Client table: 姓名, 手机, 邮箱, 微信, 有效性, 注册, 跟进状态, 最后跟进, 价值评分
- Validity badge: ✅有效 / 🔴无效邮箱 / 🔴缺少信息
- Registration badge: ✅已注册 / ❌未注册
- Follow-up status badge: 待跟进 / 已联系 / 有意向 / 已转化 / 已流失
- Value score: ⭐ prefix with numeric score
- Expandable row showing answer summary

#### Scenario: Super admin views client list
- **WHEN** super_admin clicks "查看" on a Sales row in layer 2
- **THEN** page navigates to `?survey=xxx&sales=yyy` and shows full client list with PII

#### Scenario: Client row expanded
- **WHEN** super_admin clicks a client row
- **THEN** an expandable section shows the client's survey answer summary (question → answer pairs)

#### Scenario: Long-idle follow-up flagged
- **WHEN** a valid client has follow_up_status='pending' and was completed more than 3 days ago
- **THEN** the row shows a visual warning (e.g., amber background or "未及时跟进" tag)

### Requirement: Breadcrumb navigation
The panel SHALL display a breadcrumb navigation bar at the top that reflects current drill-down level:
- Layer 1: 问卷总览
- Layer 2: 问卷总览 > {问卷名称}
- Layer 3: 问卷总览 > {问卷名称} > {Sales名称}

Each breadcrumb segment SHALL be clickable to navigate back to that layer.

#### Scenario: Navigate back from layer 3 to layer 1
- **WHEN** user clicks "问卷总览" in breadcrumb while on layer 3
- **THEN** page navigates to analytics page with no query params (layer 1)
