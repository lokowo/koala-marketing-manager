## Why

The current Sales dashboard and Admin sales-overview use different, inconsistent KPI presentations — the Sales dashboard has 4 generic metric cards (commission, visits, registrations, conversions) without target progress or conversion rates, while the Admin overview uses emoji-based summary cards and a legacy weekly KPI table. Neither visualizes the full 4-level sales funnel (visits → registrations → payments → offline conversion) with per-level targets, color-coded progress, and inter-level conversion rates. The referral-users page also lacks the ability to mark offline conversions, and the KPI targets page doesn't include KPI 4 (offline).

## What Changes

- Replace Sales dashboard's 4 KPI cards with funnel-aware cards showing per-KPI targets, color-coded progress bars, and conversion rates between levels
- Replace Sales dashboard's conversion funnel section with a 4-level funnel visualization including KPI numbers, colored bars, and inter-level conversion rate arrows
- Add "线下转化" column to Sales referral-users table with mark-offline button and confirmation dialog
- Replace Admin sales-overview's team summary cards and KPI table with 4 team KPI funnel cards and a per-agent KPI detail table with color-coded percentages
- Add KPI bar chart to Admin sales-overview showing all 4 KPIs per agent with 100% reference line
- Add KPI 4 (offline) input card to Admin KPI targets page

## Capabilities

### New Capabilities
- `sales-kpi-cards`: Funnel-aware KPI card component with target progress, color-coded bars, and inter-level conversion rates for both Sales and Admin dashboards
- `sales-funnel-visualization`: 4-level funnel visualization with KPI numbers, proportional bars, and conversion rate arrows
- `offline-conversion-marking`: UI for marking referrals as offline-converted with confirmation dialog and notes field

### Modified Capabilities
_None — no existing spec-level requirements are changing, only UI presentation._

## Impact

- `app/dashboard/sales/page.tsx` — KPI cards and funnel section rewritten
- `app/dashboard/sales/referral-users/page.tsx` — offline column + mark dialog added
- `app/dashboard/koala/sales-overview/page.tsx` — team KPI cards, agent KPI table, and bar chart added
- `app/dashboard/koala/kpi-targets/page.tsx` — KPI 4 input added
- Backend APIs already return all needed data (dashboard-stats, sales-kpi-overview, mark-offline, my-referrals)
- No new database changes needed
- No new npm dependencies needed (recharts already installed)
