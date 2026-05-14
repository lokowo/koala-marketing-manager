## Why

Super Admin 需要通过调研问卷监督 Sales 团队的工作效率和客户转化效果。当前的问卷分析页面只有单问卷维度的图表统计，缺少跨问卷聚合总览、按 Sales 分解的业绩追踪、以及客户级别的跟进详情。Super Admin 无法一眼看出哪个 Sales 在积极工作、哪个在偷懒、哪些有效客户没有被及时跟进。

## What Changes

- 新增跨问卷聚合总览面板（第一层）：所有问卷的关键指标表格 + 汇总卡片
- 新增 Sales 业绩分解面板（第二层）：按 Sales 分组的工作量/转化率/每日明细，含活跃度标记（✅⚠️🔴）
- 新增客户详情列表面板（第三层）：完整客户联系信息 + 跟进状态 + 价值评分 + 问卷回答摘要
- 新增 3 个 API endpoint（super_admin only）：survey-overview、sales breakdown、client details
- 权限分层：Super Admin 三层全部可见，Admin 只看第一层汇总数字（无 Sales 明细/客户信息），Sales 无权访问

## Capabilities

### New Capabilities
- `survey-overview-api`: 三个聚合 API（问卷总览、Sales 分解、客户详情），super_admin only，数据源为 surveys + survey_responses + survey_share_links + admin_work_logs + user_profiles
- `survey-overview-panel`: 三层钻取前端面板，复用现有 analytics 页面路由，通过 URL query 参数控制层级（无参=第一层，?survey=xxx=第二层，?survey=xxx&sales=yyy=第三层）

### Modified Capabilities
_(none — 现有 analytics 页面和 API 保持不变，Super Admin 看到新面板，Admin 看到原有视图)_

## Impact

- **新增文件**: 3 个 API route（`/api/admin/survey-overview/`）、1 个重写的 analytics 前端页面
- **修改文件**: `app/dashboard/koala/surveys/analytics/page.tsx`（Super Admin 看新面板，Admin 保持原有视图）
- **数据库**: 无 schema 变更，纯读取聚合
- **依赖**: 无新依赖
- **权限**: 依赖现有 `getServerUser()` + `getUserRole()` + `requireSuperAdmin()`
