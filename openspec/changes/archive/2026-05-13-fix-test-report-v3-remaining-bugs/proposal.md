## Why

测试报告 v3 中有 8 个 bug 横跨销售后台、用户前端、超级管理员后台三个区域，其中多个 bug 已被重复报告 3-4 次。核心问题是：Sales 角色权限边界不清导致关键页面不可达，问卷状态管理链路断裂，以及积分发放逻辑存在静默失败。这些问题直接影响销售团队日常运营和用户体验，必须立即修复。

## What Changes

### 销售后台 `/dashboard/sales`

- **Bug 1 — Sales 无法查看问卷回复详情**：回复页面仅存在于 `/dashboard/koala/surveys/responses`，而 koala layout 会将 Sales 角色重定向到 `/dashboard/sales`，导致 Sales 永远无法访问。需要在 `/dashboard/sales/surveys/` 下创建 Sales 专属的回复查看页面，并在问卷列表中添加"查看回复"入口。
- **Bug 2 — 暂停按钮不存在**：问卷列表页面只有"结束"按钮，没有"暂停"按钮。`STATUS_MAP` 中定义了 `paused` 状态但 UI 没有触发入口。需要添加暂停按钮 + 前端状态刷新。
- **Bug 3 — 侧边栏菜单项错误**：Sales layout 实际只有 3 个正确的菜单项（仪表盘、问卷管理、操作记录），但用户报告看到了"教授库""博客管理""Banner管理"。需要排查是否存在 layout 混用或缓存问题，确保 Sales 只看到属于自己的菜单。

### 用户前端 `/s/[code]`

- **Bug 4 — 问卷完成后跳转地址错误**：`success/page.tsx` 中按钮链接为 `/koala/home`（已正确），但 QR 码生成 API 的 fallback URL 仍为 `https://koalastudy.net`（旧域名）。需统一为 `koalaphd.com`。同时页面品牌名"Koala Study Advisors"需更新。
- **Bug 5 — 微信号硬编码散落各处**：`constants.ts` 中 `wechat: 'MissKoalaAu'` 已正确，但多个文件直接硬编码微信号而非引用 `BRAND.wechat`。需将所有硬编码替换为常量引用，确保未来修改只需改一处。

### 积分系统

- **Bug 6 — 邀请积分未发放**：注册 API 中的积分发放逻辑在 try-catch 中静默失败（错误只 console.error 不返回）。验证后的 claim 路由通过 fire-and-forget fetch 调用，认证状态可能尚未传播导致 401。需要：加固注册时的积分发放逻辑 + 确保 claim 路由有重试机制或同步等待认证完成。

### 超级管理员后台 `/dashboard/koala`

- **Bug 7 — Admin 数据分析页缺少回复内容**：问卷列表页已有"回复"链接（上次修复添加），但回复页面对 super_admin 的数据展示可能不完整。需确认 `/api/admin/me` 返回正确角色 + 回复列表页展示完整回复内容（不仅是联系信息，还有问题答案）。
- **Bug 8 — 问题编辑器缺少全局保存按钮**：当前每个问题需单独展开后点"保存"，顶部的"保存"按钮只保存问卷元数据不包含未逐个保存的问题编辑。用户添加/删除问题后没有明显的保存入口和 UI 刷新。需要：添加/删除操作后立即持久化 + UI 刷新，或增加全局保存按钮将所有问题变更一起提交。

## Capabilities

### New Capabilities

- `sales-survey-responses`: Sales 专属的问卷回复查看页面和入口，替代不可达的 koala 路径
- `survey-pause-control`: 问卷暂停/恢复功能的完整 UI 链路（按钮 + API + 状态刷新）
- `question-editor-save`: 问题编辑器的全局保存机制，添加/删除后自动持久化和 UI 刷新

### Modified Capabilities

- `sales-sidebar`: 确保 Sales layout 菜单项正确，排除 Admin 专属功能
- `survey-completion-redirect`: 修复 QR 码 fallback URL + 品牌名一致性
- `wechat-id-centralization`: 将散落的硬编码微信号统一为 `BRAND.wechat` 常量引用
- `referral-credits`: 加固注册时积分发放逻辑，消除静默失败和竞态条件
- `admin-survey-analytics`: 确保 Super Admin 在分析页面能看到完整的回复内容和问题答案

## Impact

**受影响的文件（预估）：**

| 区域 | 文件 |
|------|------|
| Sales 回复页 | `app/dashboard/sales/surveys/[id]/responses/page.tsx`（新建）、`app/dashboard/sales/surveys/page.tsx` |
| 暂停功能 | `app/dashboard/sales/surveys/page.tsx`、`app/dashboard/koala/surveys/page.tsx`、`app/api/surveys/[id]/route.ts` |
| Sales 侧边栏 | `app/dashboard/sales/layout.tsx` |
| 问卷完成页 | `app/s/[code]/success/page.tsx`、`app/api/surveys/qrcodes/route.ts` |
| 微信号 | `app/s/[code]/page.tsx`、`app/s/[code]/success/page.tsx`、`app/koala/chat/page.tsx`、`app/lib/prompts/system.ts`、`app/api/user/messages/route.ts`、`app/dashboard/koala/settings/page.tsx` |
| 积分 | `app/api/auth/register/route.ts`、`app/api/user/referral/claim/route.ts`、`app/koala/auth/page.tsx` |
| Admin 分析 | `app/dashboard/koala/surveys/responses/page.tsx` |
| 问题编辑器 | `app/components/survey/QuestionEditor.tsx`、`app/dashboard/koala/surveys/edit/page.tsx`、`app/dashboard/sales/surveys/[id]/edit/page.tsx` |

**API 变更：** 无新 API，仅修复现有 API 的边界情况。

**数据库：** 无 schema 变更。可能需要确认 `surveys.status` CHECK 约束已包含 `paused`。

**风险：** 低。所有修改限定在 bug 修复范围内，不引入新功能架构。
