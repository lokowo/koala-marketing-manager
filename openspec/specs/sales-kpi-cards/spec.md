## ADDED Requirements

### Requirement: Sales dashboard KPI cards show 4-level funnel metrics
The Sales dashboard (`/dashboard/sales`) MUST display 4 KPI cards in a 2x2 grid (4 columns on desktop): KPI 1 Visits (blue #3B82F6, IconQrcode), KPI 2 Registrations (green #22C55E, IconUserPlus), KPI 3 Payments (amber #F59E0B, IconCreditCard), KPI 4 Offline (purple #8B5CF6, IconHandshake).

Each card MUST show:
- Colored icon in a tinted background pill (top left) with KPI number label
- Current value as large text (text-3xl font-light)
- Target and completion percentage
- Progress bar with color thresholds: <30% red, 30-70% amber, >70% green, >100% blue
- Conversion rate from previous KPI level (KPI 2/3/4 only; KPI 1 shows null)

#### Scenario: All KPIs have targets set
- **WHEN** dashboard loads with kpi.visits.target=50, kpi.registrations.target=20, kpi.conversions.target=10, kpi.offline.target=5
- **THEN** each card shows "目标 {target} · 完成 {pct}%" and a progress bar colored by threshold

#### Scenario: Conversion rates between levels
- **WHEN** visits=50, registrations=20, conversions=5, offline=2
- **THEN** KPI 2 shows "转化率 40% (扫码访问)", KPI 3 shows "转化率 25% (注册)", KPI 4 shows "转化率 40% (付费)"

#### Scenario: Target exceeds 100%
- **WHEN** registrations current=25 and target=20
- **THEN** progress bar fills to 100% width with blue (#3B82F6) color and shows "125%"

### Requirement: Admin sales-overview team KPI summary cards
The Admin sales-overview page (`/dashboard/koala/sales-overview`) MUST display 4 team-total KPI cards with the same visual structure as Sales KPI cards but showing aggregated data across all agents. Card names MUST be prefixed with "团队" (e.g., "团队扫码", "团队注册", "团队付费", "团队线下").

#### Scenario: Team totals aggregate all agents
- **WHEN** admin loads sales-overview and API returns team_totals with kpi1.current=90, kpi2.current=60
- **THEN** cards show aggregated values with team targets and completion percentages

### Requirement: Admin per-agent KPI detail table
The Admin sales-overview page MUST display a table with columns: 销售, KPI 1 扫码, KPI 2 注册, KPI 3 付费, KPI 4 线下, 总完成率. Each KPI cell MUST show "{current}/{target}" with percentage colored by threshold. Overall completion MUST use weighted formula: KPI1×15% + KPI2×25% + KPI3×35% + KPI4×25%.

#### Scenario: Agent with mixed KPI achievement
- **WHEN** agent has kpi1=40/50 (80%), kpi2=15/20 (75%), kpi3=3/10 (30%), kpi4=1/5 (20%)
- **THEN** table shows green for KPI 1/2, amber for KPI 3, red for KPI 4, and overall = 80×0.15 + 75×0.25 + 30×0.35 + 20×0.25 = 46%

### Requirement: Admin KPI bar chart
The Admin sales-overview page MUST show a recharts BarChart with 4 grouped bars per agent (blue KPI1, green KPI2, amber KPI3, purple KPI4) showing completion percentage. A dashed ReferenceLine at y=100 MUST mark the 100% target line.

#### Scenario: Chart renders with correct colors
- **WHEN** page loads with agent data
- **THEN** chart shows bars with fill colors #3B82F6, #22C55E, #F59E0B, #8B5CF6 and a 100% reference line

### Requirement: Admin KPI targets page includes KPI 4
The KPI targets page (`/dashboard/koala/kpi-targets`) MUST display 5 target input cards: KPI 1 Visits, KPI 2 Registrations, KPI 3 Payments, KPI 4 Offline, Revenue. Each card shows current progress with a mini progress bar.

#### Scenario: KPI 4 target input
- **WHEN** admin opens KPI targets page
- **THEN** a "KPI 4 · 线下转化" input card is visible alongside the existing 4 cards
- **AND** batch-set form includes KPI 4 offline field
