## Context

Koala PhD 后台有三个角色层：Sales（销售）、Admin（管理员）、Super Admin（超级管理员）。Sales 使用 `/dashboard/sales` layout，Admin/Super Admin 使用 `/dashboard/koala` layout。两个 layout 互相重定向对方角色。

当前问题：多个功能只在 `/dashboard/koala` 下实现，Sales 因 layout redirect 无法访问；问卷状态管理 UI 不完整；积分发放静默失败；问题编辑器保存流程断裂。

**已有修复历史：** commit `4b2e38a` 修复了 v3 报告中的 Bug 1/2/5/6/7（部分），但这些 bug 依然存在或修复不彻底。本次需要从根因出发彻底解决。

## Goals / Non-Goals

**Goals:**
- Sales 能在自己的后台完整查看问卷回复详情（含联系信息和答案）
- 问卷暂停/恢复功能完整可用（UI + API + 前端刷新）
- Sales 侧边栏仅显示与 Sales 角色相关的菜单项
- 所有面向用户的品牌名、微信号、域名统一正确
- 邀请码积分发放可靠，不静默失败
- Super Admin 能在分析页看到问卷回复的完整内容（联系信息 + 答案）
- 问题编辑器添加/删除后有全局保存入口且 UI 即时刷新

**Non-Goals:**
- 不重构权限系统或 layout 架构
- 不新增 API 路由（复用现有 `/api/surveys/responses`）
- 不改动数据库 schema（CHECK 约束上次已修复支持 paused/closed/deleted）
- 不合并 Sales 和 Admin 的问卷编辑页面

## Decisions

### D1: Sales 回复页 — 新建页面而非修改 layout redirect

**选择：** 在 `/dashboard/sales/surveys/[id]/responses/page.tsx` 新建一个 Sales 专属回复页面。

**替代方案：** 修改 `/dashboard/koala` layout 允许 Sales 访问特定子路径。

**理由：** 修改 layout redirect 会破坏角色隔离的设计原则。Sales 和 Admin 看到的数据列不同（Sales 看联系信息，Admin 看聚合数据），分开维护更清晰。新页面复用现有 `/api/surveys/responses` API，仅在前端展示层分离。

**入口：** 在 `app/dashboard/sales/surveys/page.tsx` 的表格操作列添加"回复"按钮，链接到 `/dashboard/sales/surveys/${id}/responses`。

### D2: 暂停功能 — 在现有"结束"按钮旁添加"暂停"按钮

**选择：** 在问卷状态为 `active` 时同时显示"暂停"和"结束"按钮；状态为 `paused` 时显示"恢复"（→ active）和"结束"按钮。

**理由：** `STATUS_MAP` 和 API 已支持 `paused` 状态，数据库 CHECK 约束也在上次修复中添加了 `paused`。只需在 UI 层补入口。`handleStatusChange` 函数已存在且通用，调用 `handleStatusChange(id, 'paused')` 即可。两个后台（Sales + Admin）都需要添加。

### D3: Sales 侧边栏 — 验证而非修改

**选择：** Sales layout (`app/dashboard/sales/layout.tsx`) 的 `NAV_ITEMS` 只有 3 项（仪表盘、问卷管理、操作记录），这是正确的。

**根因排查方向：**
1. 浏览器缓存/Service Worker 缓存了旧的 `/dashboard/koala` layout
2. Sales 用户被错误分配了 admin 角色，导致进入了 koala layout
3. URL 直接访问了 `/dashboard/koala` 的页面而非 `/dashboard/sales`

**操作：** 确认 Sales layout redirect 逻辑完整（当前代码允许 admin/super_admin 也访问 Sales 后台）。如果用户仍然报告此问题，需要检查其账号角色配置。此项标记为"验证"而非"修改"。

### D4: 品牌名和域名统一

**选择：** 将所有硬编码的 `Koala Study Advisors` 和 `koalastudy.net` 替换为 `BRAND` 常量引用。

**具体替换：**
- `app/s/[code]/page.tsx:206,347` — `Koala Study Advisors` → 引用 `BRAND.name`
- `app/s/[code]/success/page.tsx:20` — `Koala Study Advisors` → 引用 `BRAND.name`
- `app/components/survey/SurveyPreview.tsx:86` — `Koala Study Advisors` → 引用 `BRAND.name`
- `app/api/surveys/qrcodes/route.ts:49` — `https://koalastudy.net` → `https://koalaphd.com`

**注意：** `app/lib/server/academic-search.ts` 中的 `mailto=info@koalastudy.net` 是 OpenAlex API 的联系邮箱，不是面向用户的品牌展示，暂不改动。`app/api/ai/export/route.ts` 中的 `koalastudy.net` 也需要统一为 `koalaphd.com`。

### D5: 微信号集中化 — import BRAND 常量

**选择：** 所有文件中硬编码的 `MissKoalaAu` 替换为 `import { BRAND } from '@/lib/constants'` + `BRAND.wechat`。

**受影响文件：**
- `app/s/[code]/success/page.tsx:33`
- `app/s/[code]/page.tsx:359`（已 hardcode）
- `app/koala/chat/page.tsx:346`
- `app/dashboard/koala/settings/page.tsx:100`
- `app/lib/prompts/system.ts:40,67,80`
- `app/api/user/messages/route.ts:152`

**注意：** `app/s/[code]/page.tsx` 和 `app/s/[code]/success/page.tsx` 是 `'use client'` 组件，可以直接 import 常量（常量文件不包含服务端 secret）。prompt 文件和 API 路由也可以直接 import。

### D6: 积分发放加固 — 错误上抛 + await claim

**选择：** 两处加固：

1. **注册 API (`app/api/auth/register/route.ts`)**：当前 try-catch 吞掉了积分发放错误。改为：仍然 catch（注册不应因积分失败而整体失败），但在 response 中返回 `creditApplied: false` 标志，前端可据此提示用户。同时确保 `user_profiles` 创建时初始化 `credits_remaining: 30`（而非依赖 `|| 30` fallback）。

2. **验证后 claim (`app/koala/auth/page.tsx`)**：当前 fire-and-forget `fetch().catch(() => {})`。改为 `await fetch(...)` 并确保在 `signInWithPassword` 成功后再调用（确保 session 已建立）。

**`credits_remaining` 初始值：** 在 `upsert user_profiles` 时显式设置 `credits_remaining: 30`，消除 `(myProfile?.credits_remaining || 30)` 这个不可靠的 fallback。

### D7: Super Admin 回复页 — 同时展示联系信息和答案

**选择：** 修改 `/dashboard/koala/surveys/responses/page.tsx`，对 super_admin 角色同时展示联系信息列 **和** 问题答案列。当前逻辑是 `isSales || isSuperAdmin` 看联系信息，其他（admin）看答案。改为 super_admin 两者都看。

### D8: 问题编辑器 — 顶部"保存"按钮 scope 扩大

**选择：** 修改 `handleSaveAll()` 使其在 `buildSurveyJson()` 之前先收集所有问题的当前状态（包括未单独保存的编辑），而非仅依赖 `survey.questions` state。

**具体做法：**
- 将 QuestionEditor 改为受控组件，每次编辑时通过 `onChange` 回调实时更新父组件的 questions state
- 添加/删除问题后立即更新 state + 自动调用保存
- 删除问题需要 confirm 确认
- 添加问题后新问题自动展开编辑状态

这样顶部"保存"按钮始终能保存所有最新的问题内容。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Bug 3 可能是用户端缓存问题而非代码问题 | 先验证代码正确性，如确认代码无误则在修复说明中建议用户清除缓存 |
| 积分 fallback `|| 30` 改为显式初始化可能影响已有用户 | 只在新注册时设置初始值，不 backfill 已有用户（他们已有正确余额） |
| QuestionEditor 改为受控组件可能引入性能问题 | 问卷问题数量通常 < 20，性能影响可忽略 |
| `koalastudy.net` 域名可能仍在 DNS 中作为 redirect | 本次只改代码引用，DNS 配置不在 scope 内 |
| Sales 回复页是新文件，可能与现有客户详情页(`clients/page.tsx`)功能重叠 | 回复页展示所有回复的完整问答，客户页按 sales_code 筛选客户联系信息，职责不同 |
