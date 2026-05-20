# Spec: Sales Dashboard Redesign

## ADDED Requirements

### Requirement: Welcome Bar
The dashboard MUST display a welcome bar showing the sales agent's display_name, their referral_code with a click-to-copy button, and their current tier badge.

#### Scenario: Welcome bar renders with user info
- **WHEN** a sales user loads /dashboard/sales
- **THEN** the welcome bar shows their display_name, a copyable referral_code, and a tier badge reflecting their current tier

#### Scenario: Click to copy referral code
- **WHEN** the user clicks the referral_code in the welcome bar
- **THEN** the code is copied to clipboard and a brief "已复制" toast confirmation appears

### Requirement: KPI Cards
The dashboard MUST display 4 KPI cards: commission (佣金), visits (访问量), registrations (注册数), and conversions (转化数). Each card MUST show the current value, a trend percentage compared to the previous period, and a progress bar. Each card MUST be clickable to navigate to its respective detail page.

#### Scenario: KPI cards display with trend data
- **WHEN** the dashboard loads successfully
- **THEN** 4 KPI cards render with current values, trend percentages (positive in green, negative in red), and progress bars filled proportionally

#### Scenario: KPI card click navigates to detail
- **WHEN** the user clicks the commission KPI card
- **THEN** they are navigated to /dashboard/sales/my-commissions

### Requirement: 30-Day Trend Chart
The dashboard MUST display an AreaChart showing visits and registrations as two separate lines over time. A toggle MUST allow switching between 7d, 30d, and 90d time ranges. The default view SHALL be 30d.

#### Scenario: Trend chart renders with default 30d range
- **WHEN** the dashboard loads
- **THEN** an AreaChart displays with visits and registrations lines for the last 30 days, and the 30d toggle is selected by default

#### Scenario: Toggle changes chart time range
- **WHEN** the user clicks the 7d toggle button
- **THEN** the chart re-renders showing only the last 7 days of data

### Requirement: Team Ranking
The dashboard MUST show a team ranking section displaying the top 5 sales agents by performance. The current user's row MUST be visually highlighted if they appear in the list.

#### Scenario: Team ranking with current user highlighted
- **WHEN** the dashboard loads and the current user is ranked in the top 5
- **THEN** the ranking list shows 5 rows with the current user's row highlighted with a distinct background color

### Requirement: Channel Breakdown
The dashboard MUST display a channel breakdown section with horizontal bar charts showing the distribution of visits/registrations across different promotion channels.

#### Scenario: Channel breakdown bars render proportionally
- **WHEN** the dashboard loads with channel data
- **THEN** horizontal bars display for each channel, scaled proportionally to the highest-performing channel

### Requirement: Conversion Funnel
The dashboard MUST display a conversion funnel visualization showing the pipeline: visits -> registrations -> payments -> renewals. Each stage MUST show its count and conversion rate to the next stage.

#### Scenario: Funnel renders with conversion rates
- **WHEN** the dashboard loads with funnel data
- **THEN** a funnel visualization shows 4 stages (visits, registrations, payments, renewals) with counts and percentage conversion rates between stages

### Requirement: Recent Commissions Table
The dashboard MUST show a recent commissions table displaying the 5 most recent commission entries. A "查看全部" link MUST navigate to /dashboard/sales/my-commissions.

#### Scenario: Recent commissions with view-all link
- **WHEN** the dashboard loads with commission data
- **THEN** a table shows the 5 most recent commissions and a "查看全部" link is visible that navigates to the full commissions page

### Requirement: Quick Promo Bar
The dashboard MUST include a quick promo bar with buttons to copy promotion links for different channels.

#### Scenario: Quick promo bar copy functionality
- **WHEN** the user clicks a channel copy button in the quick promo bar
- **THEN** the promotion link for that channel is copied to clipboard with a toast confirmation

### Requirement: Extended Dashboard Stats API
The /api/dashboard/sales/stats endpoint MUST return an extended response including KPI values with trends, chart data for the selected time range, team ranking, channel breakdown, funnel data, and recent commissions.

#### Scenario: API returns complete dashboard data
- **WHEN** the frontend requests GET /api/dashboard/sales/stats?range=30d
- **THEN** the response includes kpiCards, trendChart, teamRanking, channelBreakdown, conversionFunnel, and recentCommissions fields
