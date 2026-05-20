# Spec: Sales Pages Redesign

## ADDED Requirements

### Requirement: My Commissions Page (佣金明细)
The my-commissions page MUST display 3 summary cards at the top: pending (待结算), confirmed (已确认), and paid (已发放). Each card MUST have a colored left border (yellow for pending, blue for confirmed, green for paid). Below the cards, a tab filter MUST switch between all/pending/confirmed/paid. The commissions table MUST include pagination.

#### Scenario: Summary cards show correct totals with colored borders
- **WHEN** a sales user navigates to /dashboard/sales/my-commissions
- **THEN** 3 summary cards display with colored left borders (yellow/blue/green) showing the total amounts for pending, confirmed, and paid commissions

#### Scenario: Tab filter narrows table results
- **WHEN** the user clicks the "待结算" tab
- **THEN** the table filters to show only pending commissions and the pagination resets to page 1

#### Scenario: Pagination works correctly
- **WHEN** the user clicks page 2 in the pagination controls
- **THEN** the table loads and displays the next page of commission records

### Requirement: Channel Analytics Page (渠道分析)
The channel-analytics page MUST include a time filter with 7d, 30d, and 90d options (default 30d). It MUST display a PieChart showing channel distribution and a BarChart showing channel performance. A detailed table below MUST be sorted by commission amount descending.

#### Scenario: Time filter changes chart data
- **WHEN** the user selects the 7d time filter
- **THEN** both the PieChart, BarChart, and the detailed table update to reflect the last 7 days of data

#### Scenario: Table sorted by commission
- **WHEN** the channel-analytics page loads
- **THEN** the detailed table rows are sorted by commission amount in descending order

### Requirement: Referral Users Page (我的客户)
The referral-users page MUST display 4 summary cards at the top. It MUST include a search bar and filter controls. The main table MUST support row click to navigate to a customer detail view. Pagination MUST be implemented.

#### Scenario: Summary cards and search
- **WHEN** the referral-users page loads
- **THEN** 4 summary cards display (total clients, active, converted, churned) and a search bar is available

#### Scenario: Row click opens customer detail
- **WHEN** the user clicks a row in the referral users table
- **THEN** they are navigated to the customer detail view for that user

#### Scenario: Search filters table results
- **WHEN** the user types a name in the search bar
- **THEN** the table filters to show only matching customers

### Requirement: Customer Detail View
The customer detail view MUST show an info card with avatar, name, and status tags. It MUST display a consumption history table and an activity timeline.

#### Scenario: Customer detail shows complete info
- **WHEN** the user navigates to a customer detail view
- **THEN** the page shows the customer's info card (avatar, tags), a consumption table listing their purchases, and a chronological timeline of their activities

### Requirement: My Logs Page (操作记录)
The my-logs page MUST display entries in a timeline style with date grouping. Each entry type MUST have a distinct filter icon. Users MUST be able to filter by log type.

#### Scenario: Timeline renders with date groups
- **WHEN** the user navigates to /dashboard/sales/my-logs
- **THEN** log entries are displayed in a vertical timeline grouped by date, with the most recent date at the top

#### Scenario: Filter by log type
- **WHEN** the user clicks a type filter icon (e.g., "登录" or "推广")
- **THEN** the timeline filters to show only entries of that type

### Requirement: Surveys Page (问卷管理)
The surveys page MUST display survey entries in a card grid layout, visually aligned and consistent with the redesigned UI style.

#### Scenario: Surveys render as card grid
- **WHEN** the user navigates to /dashboard/sales/surveys
- **THEN** survey entries are displayed in a responsive card grid with consistent card sizing and spacing
