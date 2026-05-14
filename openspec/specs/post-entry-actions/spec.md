## ADDED Requirements

### Requirement: 录入后即时操作面板
用户点击"录入并使用"成功后，系统 SHALL 在原位置显示操作面板，包含三个操作按钮，而非跳转到其他页面。

#### Scenario: 录入成功后显示操作面板
- **WHEN** 用户在 AI 搜索结果中点击"录入并使用"且录入成功
- **THEN** 该教授卡片 SHALL 原地替换为操作面板，包含以下按钮：
  1. "查看详情" — 链接到教授详情页 `/koala/professors/{id}`
  2. "写套磁信" — 链接到 AI 对话页 `/koala/chat?action=outreach&prof={id}&name={name}`
  3. "模拟面试" — 链接到 AI 对话页 `/koala/chat?action=interview&prof={id}&name={name}`

#### Scenario: 录入失败时显示错误
- **WHEN** 用户点击"录入并使用"但数据库写入失败
- **THEN** 系统 SHALL 显示错误提示，保留原有搜索结果卡片，用户可重试

### Requirement: 操作按钮自动带入教授上下文
操作面板的"写套磁信"和"模拟面试"按钮 SHALL 通过 URL 参数将教授信息传递给 AI 对话页，确保对话自动关联该教授。

#### Scenario: 点击写套磁信跳转
- **WHEN** 用户在操作面板点击"写套磁信"
- **THEN** 系统 SHALL 跳转到 `/koala/chat?action=outreach&prof={professorId}&name={encodedName}`
- **THEN** AI 对话页 SHALL 自动进入写作模式，并预填消息"请帮我给 {教授姓名} 教授写一封申请信"

#### Scenario: 点击模拟面试跳转
- **WHEN** 用户在操作面板点击"模拟面试"
- **THEN** 系统 SHALL 跳转到 `/koala/chat?action=interview&prof={professorId}&name={encodedName}`
- **THEN** AI 对话页 SHALL 自动进入面试模式，并带入该教授的研究方向作为面试上下文

### Requirement: 操作面板显示教授摘要信息
操作面板 SHALL 展示已录入教授的关键信息，帮助用户确认操作对象。

#### Scenario: 面板展示教授基本信息
- **WHEN** 操作面板显示时
- **THEN** 面板 SHALL 包含：教授姓名、大学名称、研究方向标签、一个"已录入"成功标记

### Requirement: 操作面板视觉反馈
录入过程 SHALL 有明确的加载和成功状态反馈。

#### Scenario: 录入中显示加载状态
- **WHEN** 用户点击"录入并使用"后系统正在写入数据库
- **THEN** 按钮 SHALL 显示加载动画，禁止重复点击

#### Scenario: 录入成功过渡动画
- **WHEN** 数据库写入成功
- **THEN** 系统 SHALL 以平滑过渡动画从搜索结果卡片切换到操作面板
