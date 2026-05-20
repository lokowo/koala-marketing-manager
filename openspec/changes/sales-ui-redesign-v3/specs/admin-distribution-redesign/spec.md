# Spec: Admin Distribution Redesign

## ADDED Requirements

### Requirement: Sales Agents Management Page
The sales-agents page MUST include a search bar and an "add agent" button that opens a modal. The agents table MUST display tier badges, status badges, and monthly commission for each agent.

#### Scenario: Search filters agent list
- **WHEN** an admin types a name in the search bar on /dashboard/koala/sales-agents
- **THEN** the agents table filters to show only agents whose name or email matches the query

#### Scenario: Add agent modal
- **WHEN** the admin clicks the "添加推广员" button
- **THEN** a modal opens with fields for name, email, tier selection, and a submit button to create the agent

#### Scenario: Table shows tier and status badges
- **WHEN** the sales-agents page loads
- **THEN** each row displays a colored tier badge (e.g., Bronze/Silver/Gold) and a status badge (active/inactive), plus the agent's monthly commission total

### Requirement: Commission Rates Page
The commission-rates page MUST display rate configurations as a card grid. Each card MUST contain a slider (range 1-40%) with real-time preview calculation of example commission amounts. A save button MUST persist changes.

#### Scenario: Slider adjusts rate with live preview
- **WHEN** the admin drags the commission rate slider to 15%
- **THEN** the card updates in real time to show a preview calculation (e.g., "AUD 100 sale = AUD 15 commission")

#### Scenario: Save persists rate changes
- **WHEN** the admin adjusts rates and clicks the save button
- **THEN** the new commission rates are persisted to the database and a success toast appears

### Requirement: Commission Review Page
The commission-review page MUST display the total pending amount at the top. It MUST include tab filters for pending/confirmed/paid. The table MUST support checkbox selection and a batch "mark as paid" action with a confirmation dialog.

#### Scenario: Pending total displays at top
- **WHEN** the admin navigates to /dashboard/koala/commission-review
- **THEN** the total pending commission amount is prominently displayed at the top of the page

#### Scenario: Batch mark as paid with confirmation
- **WHEN** the admin selects 3 pending commission rows via checkboxes and clicks "标记为已发放"
- **THEN** a confirmation dialog appears showing the 3 selected items and total amount; upon confirming, all 3 are updated to "paid" status

#### Scenario: Tab filter switches view
- **WHEN** the admin clicks the "已确认" tab
- **THEN** the table filters to show only confirmed commissions

### Requirement: Sales Audit Page
The sales-audit page MUST display audit entries in a timeline style with color-coded dots per action type (e.g., green for creation, blue for update, red for deletion). Each entry MUST be expandable to show full details. Filters MUST support filtering by type, role, and date range.

#### Scenario: Timeline with color-coded dots
- **WHEN** the admin navigates to /dashboard/koala/sales-audit
- **THEN** audit entries display in a vertical timeline with color-coded dots (green for create, blue for update, red for delete)

#### Scenario: Expandable entry details
- **WHEN** the admin clicks on an audit entry
- **THEN** the entry expands to reveal full details including before/after values, user info, and timestamp

#### Scenario: Filter by type and date
- **WHEN** the admin selects action type "update" and a date range of the last 7 days
- **THEN** the timeline filters to show only update actions within that date range

### Requirement: KPI Targets Page
The kpi-targets page MUST include an agent selector and a month selector. It MUST display 4 editable target cards (visits, registrations, conversions, commission) each with a progress bar showing current vs target. An "apply to all" button MUST copy the current targets to all agents. A history table MUST show past target configurations.

#### Scenario: Agent and month selection loads targets
- **WHEN** the admin selects agent "张三" and month "2026-05"
- **THEN** 4 target cards display with that agent's current targets and progress bars showing actual vs target

#### Scenario: Edit and save individual target
- **WHEN** the admin changes the visits target to 500 and clicks save
- **THEN** the visits target for the selected agent and month is updated in the database

#### Scenario: Apply targets to all agents
- **WHEN** the admin clicks "应用到所有推广员" with targets set
- **THEN** a confirmation dialog appears; upon confirming, the current target values are copied to all active sales agents for the selected month

#### Scenario: History table shows past configurations
- **WHEN** the kpi-targets page loads
- **THEN** a history table below the target cards shows previous target configurations with agent name, month, and target values
