# Spec: Sales Sidebar Redesign

## ADDED Requirements

### Requirement: Grouped Navigation Sections
The sales sidebar SHALL organize navigation items into labeled groups: 推广, 客户, 收入, 个人. Group separator labels MUST use 11px font size and color #9CA3AF. Each group MUST be visually separated from adjacent groups.

#### Scenario: Sidebar renders with grouped sections
- **WHEN** a sales user loads any /dashboard/sales/* page
- **THEN** the sidebar displays navigation items grouped under labeled sections (推广, 客户, 收入, 个人) with separator labels styled at 11px and #9CA3AF color

### Requirement: Complete Navigation Item Set
The sidebar MUST contain the following navigation items in order: 仪表盘 (ungrouped, top), [推广] 推广中心 + 问卷管理, [客户] 我的客户 + 渠道分析, [收入] 佣金明细, [个人] 操作记录 + 个人设置. Each item MUST have an appropriate icon and highlight when active.

#### Scenario: All nav items are present and functional
- **WHEN** the sidebar is fully rendered
- **THEN** it contains exactly these items: 仪表盘, 推广中心, 问卷管理, 我的客户, 渠道分析, 佣金明细, 操作记录, 个人设置, each linking to its corresponding route

#### Scenario: Active route highlighting
- **WHEN** the user is on /dashboard/sales/promo-center
- **THEN** the 推广中心 nav item is visually highlighted as active and the 推广 group label is visible above it

### Requirement: Promo Tools Route Redirect
The old /dashboard/sales/promo-tools route MUST redirect (HTTP 308 or client-side) to /dashboard/sales/promo-center. No dead links SHALL remain in the application.

#### Scenario: Legacy promo-tools URL redirects
- **WHEN** a user navigates to /dashboard/sales/promo-tools
- **THEN** they are redirected to /dashboard/sales/promo-center without seeing a 404 page
