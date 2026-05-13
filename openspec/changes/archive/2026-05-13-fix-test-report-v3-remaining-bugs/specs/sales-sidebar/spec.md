## MODIFIED Requirements

### Requirement: Sales sidebar displays only Sales-relevant menu items
The Sales layout sidebar (`/dashboard/sales/layout.tsx`) SHALL display exactly these menu items for Sales users: 仪表盘, 问卷管理, 操作记录. The sidebar MUST NOT display Admin-only items such as 教授库, 博客管理, or Banner管理.

#### Scenario: Sales user logs into the Sales dashboard
- **WHEN** a user with role `sales` accesses `/dashboard/sales`
- **THEN** the sidebar displays exactly 3 items: 仪表盘 (`/dashboard/sales`), 问卷管理 (`/dashboard/sales/surveys`), 操作记录 (`/dashboard/sales/my-logs`)
- **AND** no Admin-only menu items are visible

#### Scenario: Sales user directly navigates to a koala dashboard URL
- **WHEN** a Sales user types `/dashboard/koala/professors` in the browser
- **THEN** the koala layout redirects them to `/dashboard/sales`
- **AND** they see only the Sales sidebar
