## Context

The Sales dashboard (`app/dashboard/sales/page.tsx`) currently displays 4 KPI cards (commission, visits, registrations, conversions) and a simple 4-stage funnel (visits→registrations→payments→renewals). The Admin sales-overview (`app/dashboard/koala/sales-overview/page.tsx`) has team summary cards with emojis and a weekly KPI table. The KPI targets page has 4 input fields (visits, registrations, conversions, revenue) but no KPI 4 (offline).

Backend APIs already support all 4 KPI levels:
- `GET /api/sales/dashboard-stats` returns `kpi.visits`, `kpi.registrations`, `kpi.conversions`, `kpi.offline` (each with current/target/pct), plus `funnel` object
- `GET /api/admin/sales-kpi-overview` returns `team_totals` (kpi1-4) and per-agent data with all 4 KPIs
- `PATCH /api/sales/mark-offline` exists and handles offline conversion marking
- `GET /api/sales/my-referrals` already returns `offline_converted`, `offline_converted_at`, `offline_notes`

No backend changes are needed. This is purely a frontend presentation upgrade.

## Goals / Non-Goals

**Goals:**
- Present a unified 4-level KPI funnel across Sales and Admin dashboards
- Show per-KPI target progress with color-coded bars and inter-level conversion rates
- Enable Sales to mark offline conversions directly from their referral-users table
- Add KPI 4 (offline) target input to Admin KPI targets page

**Non-Goals:**
- No backend API changes
- No database schema changes
- No new npm dependencies
- Not changing the existing trend chart, team ranking, channel breakdown, or recent commissions sections

## Decisions

### 1. Shared KPICard rendering pattern (not shared component)
Each page inlines its KPICard rendering rather than extracting a shared component. The Sales and Admin dashboards have slightly different needs (Sales cards are links, Admin cards are not; Sales shows individual data, Admin shows team totals). Inlining avoids premature abstraction.

### 2. Color-coded progress bar thresholds
Consistent across all pages: <30% red (#EF4444), 30-70% amber (#F59E0B), >70% green (#22C55E), >100% blue (#3B82F6). These match the existing design system's semantic colors.

### 3. Funnel visualization as horizontal bars
The funnel uses horizontal bars with proportional widths relative to KPI 1 (visits), minimum 5% width so even zero values are visible. This replaces the existing funnel which calculated percentages relative to the previous stage.

### 4. Offline marking via dialog element
Using native `<dialog>` for the confirmation modal avoids adding a modal library. The dialog includes an optional notes textarea and calls the existing `PATCH /api/sales/mark-offline` endpoint.

### 5. Weighted overall completion for Admin table
KPI1=15%, KPI2=25%, KPI3=35%, KPI4=25% — already implemented in the backend `sales-kpi-overview` API.

## Risks / Trade-offs

- [Risk] Sales dashboard becomes more visually complex → Mitigated by clean card layout with whitespace
- [Risk] `<dialog>` browser support → All modern browsers support it; the project already targets modern browsers only
