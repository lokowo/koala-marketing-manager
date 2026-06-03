## ADDED Requirements

### Requirement: Dashboard-stats endpoint accepts period and sort params
`GET /api/sales/dashboard-stats` MUST accept optional query params `period` (`week` | `month`) and `sort` (`rate` | `commission`). Unrecognized or missing values MUST default to `period=month` and `sort=rate`. The params MUST only affect the new `team_ranking_full` array and `meta`; all pre-existing response fields (`agent`, `kpi`, `trend_30d`, `team_ranking`, `channel_breakdown`, `funnel`, `recent_commissions`, and the legacy compat blocks) MUST remain unchanged and month-based.

#### Scenario: No params provided (backward compatible)
- **WHEN** the page calls `/api/sales/dashboard-stats` with no query string
- **THEN** the response includes the unchanged legacy `team_ranking` array
- **AND** also includes `team_ranking_full` and `meta` computed with defaults `period=month`, `sort=rate`

#### Scenario: Invalid param values fall back to defaults
- **WHEN** called with `?period=quarter&sort=foo`
- **THEN** the endpoint treats it as `period=month`, `sort=rate` and returns 200

### Requirement: Comprehensive KPI achievement rate
For each active agent the endpoint MUST compute a 综合达成率 as a weighted average of the four funnel KPI completions. Per-KPI completion = `actual / target`, capped at 150% (1.5). Weights MUST be 访问 0.15, 注册 0.25, 付费 0.40, 线下 0.20. KPIs whose target is 0 MUST be excluded and the remaining weights renormalized (divided by their sum). When an agent has no targets set on any KPI, the rate MUST be `null` (NOT 0) and `has_targets` MUST be `false`. Actual values MUST use the same definitions as the dashboard's 4 KPI cards: 本月起算 / `is_test=false` / current-effective `sales_kpi_targets` row.

#### Scenario: All four KPIs have targets
- **WHEN** an agent has visits 48/50, registrations 19/20, payments 9/10, offline 4/5
- **THEN** completions are 0.96, 0.95, 0.90, 0.80 and the weighted rate = (0.15·0.96 + 0.25·0.95 + 0.40·0.90 + 0.20·0.80) / 1.0 = 0.8915 → `achievement_rate` 89

#### Scenario: A KPI target is zero (dropped + renormalized)
- **WHEN** offline target is 0 and visits 50/50, registrations 20/20, payments 10/10
- **THEN** the offline KPI is excluded, remaining weights sum to 0.80, and the rate = (0.15·1 + 0.25·1 + 0.40·1) / 0.80 = 100

#### Scenario: Per-KPI completion capped at 150%
- **WHEN** payments actual 30 and target 10 (300%)
- **THEN** that KPI contributes a completion of 1.5 (150%), not 3.0

#### Scenario: Agent with no targets set
- **WHEN** an agent has all four KPI targets equal to 0
- **THEN** `achievement_rate` is `null` and `has_targets` is `false`

### Requirement: Week vs month time window
When `period=month`, KPI actuals are counted from the first day of the month and each KPI target is the effective target column value. When `period=week`, actuals are counted from `weekStart` (Monday 00:00 of the current week) and each KPI weekly target = `round(monthTarget × 7 / daysInCurrentMonth)`. `commission_month` (本月佣金) MUST always reflect the calendar month regardless of `period`.

#### Scenario: Weekly target derivation
- **WHEN** `period=week`, a month KPI target is 31 and the current month has 31 days
- **THEN** the weekly target = round(31 × 7 / 31) = 7

#### Scenario: Weekly actuals start from Monday
- **WHEN** `period=week`
- **THEN** visits/registrations/payments/offline actuals only count records on or after Monday 00:00 of the current week

### Requirement: Full team ranking array with all agents
The response MUST include `team_ranking_full`, an array containing every active sales agent (partners included). Each entry MUST contain: `agent_id`, `display_name` (= `display_name || name`), `referral_code`, `tier`, `is_me`, `rank`, `has_targets`, `achievement_rate`, `commission_month`, `commission_total`, and `kpi` with `{actual, target}` for `visits`, `registrations`, `payments`, `offline` in the selected period. The response MUST also include `meta: { period, sort, my_rank, total }`.

#### Scenario: All active agents appear
- **WHEN** the team has 7 active agents including 2 partners
- **THEN** `team_ranking_full` has 7 entries and `meta.total` = 7

#### Scenario: Ranking by achievement rate
- **WHEN** `sort=rate`
- **THEN** agents with `has_targets=true` are ordered by `achievement_rate` descending with `rank` 1..N
- **AND** agents with `has_targets=false` are appended last with `rank=null`

#### Scenario: Ranking by monthly commission
- **WHEN** `sort=commission`
- **THEN** all agents are ordered by `commission_month` descending with `rank` 1..N (reproducing the existing commission ranking, now showing all agents)

#### Scenario: Self position
- **WHEN** the requesting agent is 3rd by the active sort
- **THEN** their entry has `is_me=true` and `meta.my_rank` = 3

### Requirement: Team ranking UI with toggles, self bar, and KPI rows
The Sales dashboard (`/dashboard/sales`) team-ranking card MUST provide a 时间档 toggle (本周 / 本月, default 本月) and a 排序依据 toggle (综合达成率 / 本月佣金, default 综合达成率). It MUST show a self bar 「你当前第 N 名 / 共 M 人 · 综合达成率 X%」. Each agent row MUST show: a rank badge (ranks 1–3 = gold/silver/bronze circle with an `IconCrown` icon, others = grey `#N`), the `display_name` + referral_code + tier badge, 本月佣金 (commission-green) with 累计佣金 (muted grey), the 综合达成率 in large type (the active sort key), and four KPI color dots (访问 blue / 注册 green / 付费 amber / 线下 purple) each showing 「actual/target」. The requesting agent's row MUST be blue-highlighted with a 「你」 tag. The UI MUST use the dark theme and the visual language of the existing 4 KPI cards and MUST NOT use emoji (icons/color blocks only, per DESIGN.md).

#### Scenario: Switching sort updates the ranking
- **WHEN** the user switches 排序依据 from 综合达成率 to 本月佣金
- **THEN** the rows reorder by 本月佣金 and the self bar reflects the new rank

#### Scenario: Switching period updates KPI actuals/targets
- **WHEN** the user switches 时间档 from 本月 to 本周
- **THEN** each row's KPI 「actual/target」 dots and 综合达成率 reflect weekly values

#### Scenario: Unset-target agent label
- **WHEN** an agent has no targets (`has_targets=false`)
- **THEN** the row shows 「未设目标」 instead of a percentage and is sorted last under 综合达成率

#### Scenario: No emoji medals
- **WHEN** the ranking renders top-3 agents
- **THEN** ranks are shown with gold/silver/bronze circles + crown icon (Tabler), never 🥇🥈🥉 emoji
