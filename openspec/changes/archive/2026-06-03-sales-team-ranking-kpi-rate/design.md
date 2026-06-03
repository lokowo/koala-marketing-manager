## Context

The Sales dashboard pulls everything from a single endpoint `GET /api/sales/dashboard-stats` (no params today). The team-ranking block there computes a top-5 monthly-commission list with `is_me` and emoji medals. We extend the same endpoint (the page makes only this one call) so the page can render two ranking modes and two time windows without a second round-trip.

Grounding facts read from the existing code (must be matched exactly so the new ranking is consistent with the 4 KPI cards above it):

- **本月起算**: `monthStart = new Date(year, month, 1)`.
- **当前生效 target 行**: `sales_kpi_targets` where `effective_from <= today <= effective_until`, ordered `effective_from desc`, first row. Columns: `kpi_1_visits`, `kpi_2_registrations`, `kpi_3_payments`, `kpi_4_offline`.
- **访问 actual**: `sales_visits` count, `is_test=false`, `visited_at >= periodStart`.
- **注册 actual**: `sales_referrals` count, `is_test=false`, `created_at >= periodStart`.
- **付费 actual**: `sales_commissions` count, `status != 'rejected'`, `created_at >= periodStart` (same definition the KPI-3 card uses: `commsThisData.length`).
- **线下 actual**: `sales_referrals` count, `is_test=false`, `offline_converted=true`, `offline_converted_at >= periodStart`.
- **本月佣金**: sum of `commission_amount` over `sales_commissions`, `status != 'rejected'`, `created_at >= monthStart`.

## Goals / Non-Goals

**Goals**
- One endpoint, backward compatible: existing `team_ranking` field stays; add `team_ranking_full` + `meta` (period/sort/my_rank/total).
- Deterministic, documented achievement-rate math.
- All active agents (incl. partners) appear; unset-target agents are visible but not rate-ranked.

**Non-Goals**
- No configurable weights (hard-coded). No display-name editing. No changes to the 4 KPI cards, funnel, or any other module. No DB migration.

## Decisions

### Query params & defaults
`GET /api/sales/dashboard-stats?period=week|month&sort=rate|commission`. Invalid/missing → `period=month`, `sort=rate`. Params only affect the new `team_ranking_full` + `meta`; the existing self-KPI cards, funnel, and legacy `team_ranking` remain month-based and unchanged.

### Period boundaries
- `month`: `periodStart = monthStart`; per-KPI target = the effective target column value (month target).
- `week`: `weekStart` = Monday 00:00 of the current week (local), computed as `now - ((now.getDay()+6)%7) days`, zeroed to 00:00. `periodStart = weekStart`. Per-KPI **weekly target = round(monthTarget * 7 / daysInCurrentMonth)** where `daysInCurrentMonth = new Date(year, month+1, 0).getDate()`.
- Actuals are recomputed against `periodStart` for the selected period only (the page refetches on toggle), so a single request computes one window.

### Achievement-rate algorithm (per agent)
```
weights = { visits: 0.15, registrations: 0.25, payments: 0.40, offline: 0.20 }
for each KPI k: completion_k = min(actual_k / target_k, 1.5)   // cap 150%
keep only KPIs where target_k > 0
if no KPI kept  -> rate = null, has_targets = false   // 「未设目标」
else:
  W = sum(weights[k] for kept k)
  rate = sum(weights[k] * completion_k for kept k) / W   // renormalized
  rate is returned as a percentage rounded to integer (e.g. 0.834 -> 83)
```
Per DESIGN.md「分母为 0 时显示 "—"/"N/A"，禁止 0%」: `rate = null` (not 0) when no targets are set; the row is labelled 「未设目标」.

### Ranking
- `sort=rate`: agents with `has_targets=true` sorted by `rate` desc; agents with `has_targets=false` appended last (in any stable order, e.g. by commission). `rank` = 1-based index among **rate-ranked** agents; unset-target agents get `rank=null`.
- `sort=commission`: all agents sorted by `commission_month` desc; `rank` = 1-based index (this reproduces the current commission ranking, now showing all agents instead of top-5).
- `is_me` flags the requesting agent's row. `meta.my_rank` / `meta.total` drive the self bar.

### Efficient aggregation
Don't issue 4 queries per agent. After loading active agents → `agentIds`, run a handful of bulk queries `.in('agent_id', agentIds)` and bucket counts/sums in JS:
- visits/referrals/payments/offline rows `>= periodStart`, grouped by `agent_id`.
- `commission_month` rows `>= monthStart`; `commission_total` all-time rows; both summed by `agent_id`.
- targets: all current-effective rows for `agentIds`, keep latest `effective_from` per agent.
- agent meta: `id, display_name, name, referral_code, tier, status='active'` — display name uses `display_name || name`.

### Response shape (additive)
```jsonc
{
  // ...all existing fields unchanged (agent, kpi, trend_30d, team_ranking, funnel, ...)
  "meta": { "period": "month", "sort": "rate", "my_rank": 3, "total": 7 },
  "team_ranking_full": [
    {
      "agent_id": "uuid",
      "display_name": "张三",
      "referral_code": "ABC123",
      "tier": "senior",
      "is_me": false,
      "rank": 1,                 // null when has_targets=false under sort=rate
      "has_targets": true,
      "achievement_rate": 92,    // null when 未设目标
      "commission_month": 320.5,
      "commission_total": 4120.0,
      "kpi": {
        "visits":        { "actual": 48, "target": 50 },
        "registrations": { "actual": 19, "target": 20 },
        "payments":      { "actual": 9,  "target": 10 },
        "offline":       { "actual": 4,  "target": 5 }
      }
    }
  ]
}
```

### Frontend (team-ranking card only)
- Two toggle rows at the card top: 时间档 (本周/本月, default 本月) and 排序依据 (综合达成率/本月佣金, default 综合达成率). Toggling refetches `dashboard-stats` with the params (or re-sorts client-side; either is acceptable as long as week/month actuals come from the API).
- Self bar: 「你当前第 {my_rank} 名 / 共 {total} 人 · 综合达成率 {rate}%」 (when `sort=commission` show the dollar instead of rate; when 未设目标 show 「未设目标」).
- Row anatomy (DESIGN.md-compliant, **no emoji**):
  - Rank badge: ranks 1/2/3 → filled circle in gold `#F59E0B` / silver `#94A3B8` / bronze `#D97706` with a small `IconCrown` (`@tabler/icons-react`); others → grey `#N` text. Unset-target rows show a muted dash.
  - Identity: 28px initial avatar + `display_name` (14px font-medium) + referral_code (mono, muted) + tier badge using the DESIGN.md 三 Tier 颜色 (Standard gray / Senior amber / Partner purple).
  - Money: 本月佣金 in commission-green (`#16a34a` / dark `#4ade80`, tabular-nums) and 累计佣金 in muted grey beneath.
  - 综合达成率: large `text-2xl font-light tabular-nums` (the active sort key); 未设目标 rows show 「未设目标」 chip instead.
  - 4 KPI dots: small color dots 访问蓝`#3B82F6` / 注册绿`#22C55E` / 付费琥珀`#F59E0B` / 线下紫`#8B5CF6`, each with 「actual/target」.
  - Self row: blue highlight + 「你」 tag.
- Dark theme: reuse the existing card classes already in the page (`bg-white dark:bg-[#1E293B] border ... dark:border-[#334155]`) and the KPI color set, matching the 4 KPI cards above.

## Risks / Trade-offs

- **Query volume**: bulk `.in()` queries scale with agent count (small team) and rows-in-period; acceptable. If the team grows large, move to SQL aggregation later.
- **`display_name` column**: if `sales_agents.display_name` doesn't exist, `display_name || name` must fall back gracefully (select both; coalesce in JS). Verified against the page's existing use of `agent.name`.
- **Week boundary**: uses server local time; the rest of the endpoint already uses `new Date(...)` local construction for `monthStart`, so this is consistent.

## Migration Plan

Pure additive API + single-card UI rewrite. No data migration. Old clients calling without params get `month`/`rate` defaults and can ignore `team_ranking_full`; `team_ranking` still present.

## Open Questions

- None blocking. Tie-breaking order among equal rates / unset-target agents is unspecified by the request → default to commission desc as a stable secondary key.
