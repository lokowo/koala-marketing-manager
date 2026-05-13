## 1. Sales 问卷回复页（Bug 1）

- [x] 1.1 创建 `app/dashboard/sales/surveys/[id]/responses/page.tsx`：复用 `/api/surveys/responses` API，展示回复列表（联系信息 + 问题答案），点击行显示详情面板。返回按钮指向 `/dashboard/sales/surveys`。
- [x] 1.2 在 `app/dashboard/sales/surveys/page.tsx` 的表格操作列添加"回复"链接，指向 `/dashboard/sales/surveys/${id}/responses`，对所有问卷可见（不限 response_count）。

## 2. 问卷暂停/恢复功能（Bug 2）

- [x] 2.1 在 `app/dashboard/sales/surveys/page.tsx` 中：为 `status === 'active'` 的问卷添加"暂停"按钮（调用 `handleStatusChange(id, 'paused')`）；为 `status === 'paused'` 的问卷添加"恢复"按钮（调用 `handleStatusChange(id, 'active')`）。
- [x] 2.2 在 `app/dashboard/koala/surveys/page.tsx` 中做同样的暂停/恢复按钮添加。
- [x] 2.3 在 `app/s/[code]/page.tsx` 中检查问卷状态，如果 `status === 'paused'` 则显示"该问卷已暂停收集"提示，不渲染问卷表单。

## 3. Sales 侧边栏验证（Bug 3）

- [x] 3.1 验证 `app/dashboard/sales/layout.tsx` 的 `NAV_ITEMS` 仅包含 3 项（仪表盘、问卷管理、操作记录）。确认没有条件逻辑会注入额外菜单项。如代码正确，在 commit message 中标注"verified — code correct, likely browser cache issue"。

## 4. 品牌域名统一（Bug 4）

- [x] 4.1 `app/api/surveys/qrcodes/route.ts:49`：将 fallback URL 从 `https://koalastudy.net` 改为 `https://koalaphd.com`。
- [x] 4.2 `app/api/ai/export/route.ts`：将所有 `koalastudy.net` 引用替换为 `koalaphd.com`（第 132、183、193 行）。
- [x] 4.3 `app/s/[code]/success/page.tsx:20`：将硬编码 `Koala Study Advisors` 替换为 import `BRAND.name`。
- [x] 4.4 `app/s/[code]/page.tsx:206,347`：将硬编码 `Koala Study Advisors` 替换为 import `BRAND.name`。
- [x] 4.5 `app/components/survey/SurveyPreview.tsx:86`：将 `Koala Study Advisors` 替换为 import `BRAND.name`。

## 5. 微信号集中化（Bug 5）

- [x] 5.1 `app/s/[code]/success/page.tsx:33`：将硬编码 `MissKoalaAu` 替换为 `BRAND.wechat`（与 4.3 同文件，合并处理）。
- [x] 5.2 `app/s/[code]/page.tsx:359`：将硬编码 `MissKoalaAu` 替换为 `BRAND.wechat`（与 4.4 同文件，合并处理）。
- [x] 5.3 `app/koala/chat/page.tsx:346`：将 `weixin://dl/chat?username=MissKoalaAu` 中的硬编码替换为 `BRAND.wechat`。
- [x] 5.4 `app/dashboard/koala/settings/page.tsx:100`：将硬编码替换为 `BRAND.wechat`。
- [x] 5.5 `app/lib/prompts/system.ts:40,67,80`：将 3 处硬编码 `MissKoalaAu` 替换为 `BRAND.wechat`。
- [x] 5.6 `app/api/user/messages/route.ts:152`：将硬编码替换为 `BRAND.wechat`。

## 6. 积分发放加固（Bug 6）

- [x] 6.1 `app/api/auth/register/route.ts:44-53`：在 `user_profiles` upsert 中显式设置 `credits_remaining: 30`。
- [x] 6.2 `app/api/auth/register/route.ts:102`：移除 `(myProfile?.credits_remaining || 30)` fallback，改为 `(myProfile?.credits_remaining ?? 0)`（此时值已为 30）。
- [x] 6.3 `app/api/auth/register/route.ts:127-129`：在 catch 块中记录完整错误上下文，在 API response 中添加 `creditApplied` 字段。
- [x] 6.4 `app/koala/auth/page.tsx`：将 referral claim 的 fire-and-forget `fetch().catch(() => {})` 改为 `await fetch()`，置于 `signInWithPassword` 成功回调内。

## 7. Super Admin 回复页增强（Bug 7）

- [x] 7.1 `app/dashboard/koala/surveys/responses/page.tsx`：修改表头逻辑，使 `isSuperAdmin` 同时展示联系信息列和问题答案列（当前互斥，改为并列）。
- [x] 7.2 同文件：修改 tbody 行渲染逻辑，`isSuperAdmin` 时同时渲染联系信息 td 和答案 td。

## 8. 问题编辑器全局保存（Bug 8）

- [x] 8.1 修改 `app/components/survey/QuestionEditor.tsx`：添加 `onChange` 回调 prop，每次字段编辑时调用 `onChange` 将当前状态传递给父组件。保留 `onSave` 用于折叠行为。
- [x] 8.2 修改 `app/dashboard/koala/surveys/edit/page.tsx`：维护 `editingQuestions` state 作为所有问题的最新快照，通过 `onChange` 回调实时更新。`handleSaveAll` 使用 `editingQuestions` 而非 `survey.questions` 构建 JSON。
- [x] 8.3 修改 `app/dashboard/sales/surveys/[id]/edit/page.tsx`：同 8.2 的修改。
- [x] 8.4 两个 edit page 中：添加问题后立即追加到 `editingQuestions` state，新问题以展开状态渲染。删除问题后从 `editingQuestions` 中移除并弹出确认对话框。
