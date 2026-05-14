## Context

当前问卷分析页面 (`/dashboard/koala/surveys/analytics`) 只支持单问卷维度的图表统计（按天回复趋势、来源分布、问题统计）。Super Admin 需要一个三层钻取面板来监督 Sales 团队工作效率。

已有数据基础：
- `survey_responses` 表有 `sales_user_id`、`follow_up_status`、`follow_up_notes`、`value_score`、`respondent_*` 字段
- `survey_share_links` 表有 `scan_count`、`response_count`、`registration_count` 计数
- `admin_work_logs` 表记录所有 Sales 操作（action_category='sales_customer'）
- `user_profiles` 表有 Sales 的 `display_name`

不需要任何 schema 变更，纯读取聚合。

## Goals / Non-Goals

**Goals:**
- Super Admin 能一眼看到所有问卷的有效回复率和转化率
- Super Admin 能按 Sales 维度下钻，看到每个人的工作量和每日活跃度
- Super Admin 能看到某个 Sales 推广来的所有客户的完整信息和跟进状态
- Admin 只能看汇总数字（无 Sales 明细、无客户 PII）

**Non-Goals:**
- 不改现有 Sales Dashboard（`/dashboard/sales`）的任何功能
- 不增加新的数据库表或字段
- 不实现导出 CSV（后续迭代）
- 不实现实时推送通知（如 Sales 偷懒提醒）

## Decisions

### 1. 页面结构：单页面 + URL query 驱动层级

**选择**: 复用 `/dashboard/koala/surveys/analytics` 路由，通过 query 参数控制层级
```
无参数        → 第一层（问卷总览）
?survey=xxx   → 第二层（Sales 分解）
?survey=xxx&sales=yyy → 第三层（客户详情）
```

**理由**: 避免创建多个新页面，面包屑导航自然形成，浏览器前进/后退正常工作。

**替代方案**: 三个独立页面 — 拒绝，因为增加文件数量且导航不连贯。

### 2. API 结构：单入口 + 参数分支

**选择**: 一个 API endpoint `GET /api/admin/survey-overview`，通过 query 参数决定返回内容：
```
GET /api/admin/survey-overview                          → 第一层数据
GET /api/admin/survey-overview?survey_id=xxx             → 第二层数据
GET /api/admin/survey-overview?survey_id=xxx&sales_id=yy → 第三层数据
```

**理由**: 减少路由文件数量，三层共享 auth 逻辑。对于 Admin 角色，第二三层返回 403。

**替代方案**: 三个独立 API route — 拒绝，因为重复的 auth 和权限检查代码。

### 3. 有效/无效问卷判定

**选择**: 在 API 层用纯 SQL/JS 计算
```
有效 = status='completed' AND respondent_name IS NOT NULL 
       AND respondent_email matches /^[^\s@]+@[^\s@]+\.[^\s@]+$/
无效 = status='completed' BUT 不满足上述条件
```

**理由**: 已有 `metadata.email_status` 字段，但并非所有历史数据都有。用 email regex 重算更可靠。

### 4. 每日活跃度标记

**选择**: 从 `admin_work_logs` 按日期统计 Sales 操作数，与 `survey_responses` 按日期统计新回复数对比：
- ✅ 某天有回复且有跟进操作
- ⚠️ 某天有新回复但 0 跟进操作
- 🔴 某天完全无活动（0 回复 + 0 操作）

**数据窗口**: 默认展示最近 14 天。

### 5. 权限控制

**选择**: API 层统一检查 `getUserRole()`，前端通过 role 条件渲染。
- `super_admin`: 三层全部可见
- `admin`: 第一层可见（隐藏 Sales 列和详情按钮），第二三层返回 403
- 其他角色: 403

## Risks / Trade-offs

- **[性能] 大量 survey_responses 聚合可能较慢** → 使用 Supabase 服务端聚合（count、group by），不拉全量数据到 JS 层。对于每日明细限制 14 天窗口。
- **[数据一致性] share_links 的 scan_count 可能与实际不一致** → 仅作展示参考，不作为考核硬指标。
- **[历史数据] 早期 survey_responses 可能没有 sales_user_id** → 这些归入"直接访问"类别，不计入任何 Sales。
