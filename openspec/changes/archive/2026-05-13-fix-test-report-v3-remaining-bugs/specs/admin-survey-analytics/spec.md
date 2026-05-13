## MODIFIED Requirements

### Requirement: Super Admin sees both contact info and question answers in responses
The survey responses page (`/dashboard/koala/surveys/responses`) SHALL display both contact information columns (name, phone, email) AND question answer columns for users with `super_admin` role. The `admin` role continues to see only question answer columns (with PII stripped by the API).

#### Scenario: Super Admin views survey responses
- **WHEN** a Super Admin opens the responses page for a survey
- **THEN** the table displays: #, 提交时间, 姓名, 手机, 邮箱, 来源, 注册 status, AND the first 3 question answers
- **AND** clicking a row shows the full detail panel with all question-answer pairs plus contact info

#### Scenario: Admin views survey responses
- **WHEN** an Admin (not super_admin) opens the responses page for a survey
- **THEN** the table displays: #, 提交时间, 来源, 注册 status, and the first 3 question answers
- **AND** no contact information columns are shown (PII is stripped by the API)

#### Scenario: Super Admin detail panel shows complete data
- **WHEN** a Super Admin clicks on a response row
- **THEN** the detail panel shows: contact info section (name, phone, email, WeChat, registration status) AND all question-answer pairs below it
