## Context

The sales distribution system has ~10 pages across sales and admin dashboards. Current pages are functional but use inconsistent styling and lack data visualizations. recharts is already installed. The dashboard-stats API exists and returns monthly KPI data but needs extension for trend/ranking/funnel data.

## Goals / Non-Goals

**Goals:**
- Unified design language across all sales/admin distribution pages
- Data visualizations with recharts (AreaChart, PieChart, BarChart)
- New promo-center with link/QR/poster tabs
- New settings page for sales agents
- Better information hierarchy with grouped sidebar navigation
- Batch operations for admin commission review

**Non-Goals:**
- Changing business logic or commission calculation algorithms
- Adding real-time WebSocket updates
- Mobile app support (responsive web only)
- Changing auth/permission model

## Decisions

**Sidebar grouping**: Use separator labels (font-size 11px, color #9CA3AF, letter-spacing 1px) between nav sections. Groups: 推广, 客户, 收入, 个人.

**Dashboard-stats API extension**: Extend existing GET endpoint to include agent info, trend data, team ranking, channel breakdown, funnel, and recent commissions. Single API call for the entire dashboard to minimize round-trips.

**promo-tools → promo-center rename**: Create new directory, add redirect from old path. Three tabs: links (9 channels), QR codes (with logo overlay), posters (Canvas API generation with 3 templates).

**Settings storage**: Add columns to sales_agents table for payment info and notification preferences. No new table needed.

**recharts usage**: AreaChart for trends, PieChart (donut) for channel distribution, BarChart for conversion funnels. Consistent color palette using the design system colors.

**Status badge colors**: Standardized across all pages — pending=#FEF3C7/#92400E, confirmed=#DCFCE7/#166534, paid_out=#DBEAFE/#1E40AF, rejected=#FEE2E2/#991B1B, refunded=#F3F4F6/#6B7280.

## Risks / Trade-offs

[Dashboard API complexity] → Single endpoint returning all dashboard data is convenient but could be slow. Mitigate with parallel DB queries (already the pattern in existing code).

[Poster generation with Canvas API] → Client-side Canvas rendering may not produce print-quality output. Acceptable for social media sharing use case.

[Large scope] → 17 items across 5 phases. Execute in order of user-facing impact: sidebar → dashboard → promo center → data pages → admin pages.
