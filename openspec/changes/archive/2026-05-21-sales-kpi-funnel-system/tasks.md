## 1. Sales Dashboard — KPI Cards Rewrite

- [x] 1.1 Replace existing KPI_CARDS array and card rendering in `app/dashboard/sales/page.tsx` with 4 funnel-aware KPI cards: KPI 1 Visits (IconQrcode, #3B82F6), KPI 2 Registrations (IconUserPlus, #22C55E), KPI 3 Payments (IconCreditCard, #F59E0B), KPI 4 Offline (IconHandshake, #8B5CF6)
- [x] 1.2 Each card: colored icon pill, KPI number label, name, large current value (text-3xl font-light), "目标 {target} · 完成 {pct}%", progress bar with color thresholds (<30% red, 30-70% amber, >70% green, >100% blue)
- [x] 1.3 Add conversion rate line to KPI 2/3/4 cards showing inter-level rate (registrations÷visits, payments÷registrations, offline÷payments)
- [x] 1.4 Update DashData interface to include `offline` field in kpi object and `offline` in funnel object (replacing `renewals`)

## 2. Sales Dashboard — Funnel Visualization Rewrite

- [x] 2.1 Replace existing funnel section in `app/dashboard/sales/page.tsx` with 4-level funnel: KPI 1 Visits (#3B82F6), KPI 2 Registrations (#22C55E), KPI 3 Payments (#F59E0B), KPI 4 Offline (#8B5CF6)
- [x] 2.2 Each level: KPI number label, name, horizontal bar (proportional to visits, min 5%), absolute count, right-side percentage
- [x] 2.3 Add conversion rate arrows between consecutive levels with IconChevronDown and amber text

## 3. Sales Referral-Users — Offline Conversion Column

- [x] 3.1 Add `offline_converted`, `offline_converted_at`, `offline_notes` fields to the Referral interface in `app/dashboard/sales/referral-users/page.tsx`
- [x] 3.2 Add "线下" column header after "佣金" column in the table
- [x] 3.3 For converted referrals: show purple badge "✅ {date}". For unconverted: show "标记转化" button
- [x] 3.4 Add dialog state (`markingId`, `markingName`, `markingNotes`) and `markOffline` function calling `PATCH /api/sales/mark-offline`
- [x] 3.5 Add confirmation dialog with user name, notes textarea, Cancel/Confirm buttons. On success, refresh referral list

## 4. Admin Sales-Overview — Team KPI Panel

- [x] 4.1 Add `kpiData` state and fetch from `GET /api/admin/sales-kpi-overview` in `app/dashboard/koala/sales-overview/page.tsx`
- [x] 4.2 Replace existing 4 emoji summary cards in "team" tab with 4 team KPI funnel cards (same visual structure as Sales cards, data from `team_totals`)
- [x] 4.3 Add per-agent KPI detail table: columns 销售, KPI 1-4, 总完成率. Each KPI cell shows "{current}/{target}" with colored percentage
- [x] 4.4 Add recharts BarChart showing per-agent KPI completion percentages (4 grouped bars per agent, 100% reference line)

## 5. Admin KPI Targets — Add KPI 4

- [x] 5.1 Add KPI 4 offline field to KPI_FIELDS array and batchForm state in `app/dashboard/koala/kpi-targets/page.tsx`
- [x] 5.2 Update target card grid to 5 columns showing all 5 target inputs with current progress mini bars

## 6. Verification

- [x] 6.1 Sales dashboard: 4 KPI cards with correct icons, colors, progress bars, and conversion rates
- [x] 6.2 Sales dashboard: funnel has 4 levels with KPI numbers, proportional bars, conversion arrows
- [x] 6.3 Referral-users: "线下" column shows badge/button, dialog works, list refreshes after marking
- [x] 6.4 Admin sales-overview: team KPI cards + per-agent table + bar chart render correctly
- [x] 6.5 Admin KPI targets: 5 input cards including KPI 4 offline
- [x] 6.6 All dark mode classes correct
- [x] 6.7 `npm run build` passes
