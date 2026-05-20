## Why

The sales distribution system UI is functional but inconsistent — pages use different card styles, lack data visualizations, and miss key workflows (poster generation, settings). This redesign unifies all sales/admin distribution pages under a cohesive design system with recharts visualizations, better information hierarchy, and new features (promo center, settings page).

## What Changes

- **Sales sidebar**: Restructure with grouped sections (推广/客户/收入/个人), rename promo-tools → promo-center, add settings page
- **Sales dashboard**: Complete rewrite with welcome bar, KPI cards, trend chart, team ranking, channel breakdown, funnel, recent commissions, quick promo bar
- **Promo center** (NEW): 3-tab page — links, QR codes, posters — replacing simple promo-tools
- **My commissions**: Add summary cards, tab filtering, enhanced table with pagination
- **Channel analytics**: Add recharts PieChart + BarChart, time range filter, detailed table
- **Referral users**: Add summary cards, search/filter, enhanced table linking to customer detail
- **Customer detail**: Redesign with info card, consumption table, timeline
- **My logs**: Redesign as timeline with date grouping and type filters
- **Settings** (NEW): Personal info, payment info, notification preferences
- **Surveys**: UI alignment to new card style
- **Admin sidebar**: Group distribution items under "分销管理" separator
- **Admin sales-agents**: Add search, enhanced table, add-agent modal
- **Admin commission-rates**: Switch from table to card grid with sliders
- **Admin commission-review**: Add batch operations, summary totals
- **Admin sales-audit**: Switch to timeline style with color-coded events
- **Admin kpi-targets**: Add agent/month selector, editable target cards

## Capabilities

### New Capabilities
- `sales-sidebar-redesign`: Restructured sales sidebar with grouped sections
- `sales-dashboard-redesign`: Data-driven dashboard with charts and KPI cards
- `sales-promo-center`: Three-tab promotion hub (links, QR, posters)
- `sales-settings-page`: Personal info, payment, and notification settings
- `sales-pages-redesign`: UI refresh for commissions, channel analytics, referral users, customer detail, logs, surveys
- `admin-distribution-redesign`: UI refresh for sales-agents, commission-rates, commission-review, sales-audit, kpi-targets

### Modified Capabilities
(none — all changes are UI-level, no spec-level behavior changes to existing capabilities)

## Impact

- `app/dashboard/sales/layout.tsx` — sidebar nav restructure
- `app/dashboard/sales/page.tsx` — complete rewrite
- `app/dashboard/sales/promo-center/` — new page (rename from promo-tools)
- `app/dashboard/sales/settings/` — new page
- `app/dashboard/sales/my-commissions/page.tsx` — enhanced UI
- `app/dashboard/sales/channel-analytics/page.tsx` — recharts integration
- `app/dashboard/sales/referral-users/page.tsx` — enhanced UI
- `app/dashboard/sales/customer/[id]/page.tsx` — redesign
- `app/dashboard/sales/my-logs/page.tsx` — timeline redesign
- `app/dashboard/sales/surveys/page.tsx` — style alignment
- `app/dashboard/koala/layout.tsx` — distribution group (already done)
- `app/dashboard/koala/sales-agents/page.tsx` — enhanced UI
- `app/dashboard/koala/commission-rates/page.tsx` — card grid with sliders
- `app/dashboard/koala/commission-review/page.tsx` — batch operations
- `app/dashboard/koala/sales-audit/page.tsx` — timeline style
- `app/dashboard/koala/kpi-targets/page.tsx` — editable cards
- `app/api/sales/dashboard-stats/route.ts` — extended response shape
- `sales_agents` table — new columns for settings
