## Why

用户通过 AI 深度搜索找到教授后，当前系统自动将其标记为 `verification_status: 'Verified'`，绕过了任何审核环节。录入后用户只能跳转到详情页，无法直接进入写套磁信或模拟面试流程，导致操作链路断裂。同时，系统不记录是谁贡献了这条数据，Admin 也没有专门的界面来审核用户贡献的教授数据。

## What Changes

- **新增 `user_contributed` 验证状态**：用户通过 AI 搜索录入的教授，`verification_status` 设为 `'user_contributed'`（而非直接 `'Verified'`），需 Admin 审核后才变为 Verified
- **数据库新增字段**：`contributed_by`（UUID，关联用户）和 `contributed_at`（TIMESTAMPTZ），记录谁在什么时候贡献了该教授
- **修改 DB CHECK 约束**：`verification_status` 约束新增 `'user_contributed'` 选项
- **录入后即时操作面板**：用户点击"录入并使用"后，不跳转页面，原地显示操作按钮（查看详情 / 写套磁信 / 模拟面试），自动带入教授信息
- **`user_contributed` 教授可用于 AI 对话**：虽然未通过审核，但录入用户自己可以立即用于写套磁信和模拟面试（公开列表不显示）
- **Admin 审核页面**：后台新增"用户贡献数据审核"页面，列出所有 `verification_status = 'user_contributed'` 的教授，支持通过/删除/编辑操作

## Capabilities

### New Capabilities
- `user-contributed-review`: Admin 后台审核用户贡献的教授数据（审核列表、通过/删除/编辑操作、贡献者信息展示）
- `post-entry-actions`: AI 搜索录入教授后的即时操作面板（查看详情/写套磁信/模拟面试按钮，自动带入教授上下文）

### Modified Capabilities
_无已有 specs 需要修改（openspec/specs/ 当前为空）_

## Impact

**数据库**：
- `professors` 表新增 `contributed_by`（UUID）、`contributed_at`（TIMESTAMPTZ）字段
- 修改 `verification_status` CHECK 约束，新增 `'user_contributed'` 值
- 公开教授列表查询需适配新状态（`user_contributed` 不在公开列表显示，但贡献者本人可使用）

**API**：
- `POST /api/professors/auto-search`：`saveCandidateToDb()` 需接受 `userId` 参数，写入 `contributed_by`，设 `verification_status: 'user_contributed'`
- `GET /api/professors`：公开列表过滤逻辑需排除 `user_contributed`（除非是贡献者本人请求）
- 新增 `GET/PUT/DELETE /api/professors/contributed`：Admin 审核接口

**前端**：
- `ProfessorsClient.tsx`：录入后显示操作面板替代跳转
- 新增 `app/dashboard/koala/professors/contributed/page.tsx`：Admin 审核页面
- AI 对话页：接收教授参数的链路不变（已有 `?action=outreach&prof={id}` 机制）

**类型**：
- `Professor` 类型的 `verificationStatus` 新增 `'user_contributed'` 选项
- `ProfessorCandidate` 类型或 `saveCandidateToDb` 函数签名需增加 `userId` 参数
