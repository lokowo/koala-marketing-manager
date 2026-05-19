## ADDED Requirements

### Requirement: Admin sidebar entry
The admin sidebar in `app/dashboard/koala/layout.tsx` SHALL include an "Ola 分析" entry linking to `/dashboard/koala/ola-analytics`, positioned after the existing "Ola 触发" entry.

#### Scenario: Sidebar shows Ola analytics link
- **WHEN** admin navigates to any dashboard page
- **THEN** sidebar shows "Ola 分析" link with a chart icon

### Requirement: Analytics API endpoint
The system SHALL provide `GET /api/admin/ola-analytics` that accepts a `section` query parameter with values: `kpi`, `funnel`, `ratings`, `triggers`.

Each section returns aggregated data from existing Ola tables. Admin auth MUST be verified.

#### Scenario: KPI section
- **WHEN** `GET /api/admin/ola-analytics?section=kpi`
- **THEN** returns `{ todaySessions, avgRating30d, activeUsers7d, totalSessions30d }`

#### Scenario: Funnel section
- **WHEN** `GET /api/admin/ola-analytics?section=funnel`
- **THEN** returns array of `{ stage, count, percentage }` from ola_sessions.metadata->conversation_stage

#### Scenario: Ratings section
- **WHEN** `GET /api/admin/ola-analytics?section=ratings`
- **THEN** returns `{ distribution: {1: n, 2: n, ...5: n}, lowRated: [{ sessionId, rating, comment, ratedAt, userId }] }`

#### Scenario: Triggers section
- **WHEN** `GET /api/admin/ola-analytics?section=triggers`
- **THEN** returns array of `{ triggerKey, shown, clicked, dismissed, clickRate }` from ola_trigger_logs

### Requirement: Analytics dashboard page
The system SHALL provide a page at `/dashboard/koala/ola-analytics` with 3 tabs: 概览, 详情, 再激活邮件.

#### Scenario: Overview tab
- **WHEN** admin opens the analytics page
- **THEN** 4 KPI cards are displayed at the top, followed by a conversation funnel (CSS bar chart), and a rating distribution (CSS bar chart)

#### Scenario: Details tab
- **WHEN** admin switches to the 详情 tab
- **THEN** trigger effectiveness table is shown (trigger key, shown/clicked/dismissed counts, click rate), and placeholder sections for Tool stats and knowledge gaps

#### Scenario: Low-rated sessions list
- **WHEN** rating distribution is displayed
- **THEN** sessions with rating <= 2 are listed below with user info, rating, comment, and timestamp

### Requirement: CSS-only charts
All charts (funnel bars, rating distribution) SHALL be implemented with CSS (div width percentages), no external chart libraries.

#### Scenario: Funnel rendering
- **WHEN** funnel data is loaded
- **THEN** horizontal bars render with widths proportional to count, showing stage name, count, and percentage
