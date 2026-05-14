## ADDED Requirements

### Requirement: User-contributed professor status
当用户通过 AI 深度搜索录入教授时，系统 SHALL 将 `verification_status` 设为 `'user_contributed'`，并记录 `contributed_by`（用户 ID）和 `contributed_at`（录入时间）。

#### Scenario: AI 搜索录入教授写入正确状态
- **WHEN** 用户在教授搜索页点击"录入并使用"将 AI 搜索到的教授存入数据库
- **THEN** 新教授记录的 `verification_status` SHALL 为 `'user_contributed'`，`contributed_by` SHALL 为当前用户的 UUID，`contributed_at` SHALL 为当前时间戳

#### Scenario: 数据库约束允许新状态值
- **WHEN** 系统尝试插入 `verification_status = 'user_contributed'` 的教授记录
- **THEN** 数据库 CHECK 约束 SHALL 允许该值（约束包含 `'Verified'`, `'Pending'`, `'Rejected'`, `'user_contributed'`）

### Requirement: User-contributed 教授不在公开列表显示
`verification_status = 'user_contributed'` 的教授 SHALL NOT 出现在公开教授列表中，但贡献者本人 SHALL 能通过 AI 对话功能使用该教授数据。

#### Scenario: 公开列表排除 user_contributed 教授
- **WHEN** 任意用户访问 `/koala/professors` 教授列表页
- **THEN** 列表 SHALL NOT 包含 `verification_status = 'user_contributed'` 的教授

#### Scenario: 贡献者可通过 AI 对话使用自己录入的教授
- **WHEN** 贡献者在录入教授后点击"写套磁信"或"模拟面试"
- **THEN** AI 对话 SHALL 能获取到该教授的完整信息并用于生成内容

### Requirement: Admin 审核列表页
Admin 后台 SHALL 提供一个"用户贡献审核"页面，展示所有 `verification_status = 'user_contributed'` 的教授，按 `contributed_at` 倒序排列。

#### Scenario: Admin 访问审核列表
- **WHEN** Admin 用户导航到后台教授审核页面
- **THEN** 页面 SHALL 显示所有 `verification_status = 'user_contributed'` 的教授列表，每条记录 SHALL 展示：教授姓名、大学、研究方向、贡献者信息、贡献时间

#### Scenario: 列表为空时显示提示
- **WHEN** Admin 访问审核页面且无 `user_contributed` 状态的教授
- **THEN** 页面 SHALL 显示"暂无待审核的用户贡献数据"提示

### Requirement: Admin 通过审核操作
Admin SHALL 能将 `user_contributed` 教授标记为 `'Verified'`，使其出现在公开列表中。

#### Scenario: Admin 通过一条教授记录
- **WHEN** Admin 在审核列表中点击某教授的"通过"按钮
- **THEN** 该教授的 `verification_status` SHALL 更新为 `'Verified'`，该教授 SHALL 出现在公开教授列表中

### Requirement: Admin 删除操作
Admin SHALL 能删除不合格的用户贡献教授记录。

#### Scenario: Admin 删除一条教授记录
- **WHEN** Admin 在审核列表中点击某教授的"删除"按钮并确认
- **THEN** 该教授记录 SHALL 从数据库中删除
- **THEN** 系统 SHALL 显示删除成功提示

#### Scenario: 删除需二次确认
- **WHEN** Admin 点击"删除"按钮
- **THEN** 系统 SHALL 弹出确认对话框，Admin 必须确认后才执行删除

### Requirement: Admin 编辑操作
Admin SHALL 能编辑用户贡献教授的信息（姓名、大学、职位、研究方向等）后再通过审核。

#### Scenario: Admin 编辑后通过
- **WHEN** Admin 修改了教授的信息字段并点击"保存并通过"
- **THEN** 教授信息 SHALL 更新为编辑后的值，`verification_status` SHALL 更新为 `'Verified'`
