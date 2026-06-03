## 1. API — query params & period boundaries

- [ ] 1.1 In `app/api/sales/dashboard-stats/route.ts`, change `GET()` to `GET(req: Request)` and parse `period` (`week|month`, default `month`) and `sort` (`rate|commission`, default `rate`) from `new URL(req.url).searchParams`. Validate against allow-lists; fall back to defaults on anything else.
- [ ] 1.2 Compute `weekStart` = Monday 00:00 of current week (`now - ((now.getDay()+6)%7) days`, time zeroed) and `daysInCurrentMonth = new Date(year, month+1, 0).getDate()`. Set `periodStart = period === 'week' ? weekStart : monthStart`.

## 2. API — per-agent KPI + commission aggregation (all active agents)

- [ ] 2.1 Extend the active-agents query to also select `display_name, referral_code, tier` (keep `id, name`). Build `agentIds`.
- [ ] 2.2 Add bulk `.in('agent_id', agentIds)` queries bucketed by agent for the selected `periodStart`: visits (`sales_visits`, `is_test=false`, `visited_at>=periodStart`), registrations (`sales_referrals`, `is_test=false`, `created_at>=periodStart`), payments (`sales_commissions`, `status!='rejected'`, `created_at>=periodStart`), offline (`sales_referrals`, `is_test=false`, `offline_converted=true`, `offline_converted_at>=periodStart`).
- [ ] 2.3 Add bulk queries for `commission_month` (sum `commission_amount`, `status!='rejected'`, `created_at>=monthStart`) and `commission_total` (sum all-time, `status!='rejected'`), grouped by agent.
- [ ] 2.4 Fetch current-effective targets for all `agentIds` (`effective_from<=today<=effective_until`); keep the latest `effective_from` row per agent. For `week`, derive each KPI weekly target = `Math.round(monthTarget * 7 / daysInCurrentMonth)`.

## 3. API — achievement-rate algorithm & ranking

- [ ] 3.1 Implement `computeRate(actuals, targets)`: per-KPI `completion = min(actual/target, 1.5)`; weights `{visits:0.15, registrations:0.25, payments:0.40, offline:0.20}`; drop KPIs with `target===0`; renormalize remaining weights; return integer percentage, or `null` (with `has_targets=false`) when no targets are set.
- [ ] 3.2 Build `team_ranking_full` entries with: `agent_id, display_name (display_name||name), referral_code, tier, is_me, has_targets, achievement_rate, commission_month, commission_total, kpi:{visits,registrations,payments,offline → {actual,target}}`.
- [ ] 3.3 Sort: `sort=rate` → `has_targets` agents by rate desc (rank 1..N), unset-target agents appended with `rank=null` (secondary key commission desc); `sort=commission` → all agents by `commission_month` desc with `rank` 1..N.
- [ ] 3.4 Add `meta: { period, sort, my_rank, total }` (`my_rank` from the requesting agent's row, `total` = active-agent count). Keep existing `team_ranking` field and all other response fields unchanged (backward compatible).

## 4. Frontend — toggles, self bar, types

- [ ] 4.1 In `app/dashboard/sales/page.tsx`, extend `DashData` with `meta` and `team_ranking_full` types; add `period`/`sort` state (default `month`/`rate`).
- [ ] 4.2 Refetch `dashboard-stats?period=&sort=` when toggles change (update `loadData` to accept params). Render two toggle rows at the team-ranking card top: 时间档 (本周/本月) and 排序依据 (综合达成率/本月佣金), styled as segmented pills, dark-theme aware.
- [ ] 4.3 Render the self bar 「你当前第 {my_rank} 名 / 共 {total} 人 · 综合达成率 {X}%」 (show 「未设目标」 when the user has no targets; show dollar when sort=commission).

## 5. Frontend — per-agent rows (no emoji, DESIGN.md compliant)

- [ ] 5.1 Replace the emoji-medal row rendering with: rank badge = gold/silver/bronze filled circle + `IconCrown` for ranks 1-3, grey `#N` otherwise, muted dash for unset-target; import `IconCrown` from `@tabler/icons-react`.
- [ ] 5.2 Identity block: 28px initial avatar + `display_name` (14px font-medium) + referral_code (mono muted) + tier badge using DESIGN.md 三 Tier 颜色 (Standard gray / Senior amber / Partner purple).
- [ ] 5.3 Money block: 本月佣金 commission-green (`#16a34a`/dark `#4ade80`, tabular-nums) + 累计佣金 muted grey.
- [ ] 5.4 Achievement block: 综合达成率 as `text-2xl font-light tabular-nums` (active sort emphasis); 未设目标 → 「未设目标」 chip.
- [ ] 5.5 KPI dots: 4 small color dots 访问蓝/注册绿/付费琥珀/线下紫 each with 「actual/target」.
- [ ] 5.6 Self row: blue highlight background + 「你」 tag.

## 6. Verification

- [ ] 6.1 `curl '/api/sales/dashboard-stats'` (no params) returns 200 with both legacy `team_ranking` and new `team_ranking_full` + `meta` (defaults month/rate).
- [ ] 6.2 `curl '...?period=week&sort=commission'` returns 200; weekly targets ≈ round(monthTarget*7/daysInMonth); ranking ordered by `commission_month`.
- [ ] 6.3 Agent with all targets=0 → `achievement_rate=null`, `has_targets=false`, appears last under sort=rate.
- [ ] 6.4 Achievement math spot-check: actuals/targets visits 48/50, reg 19/20, pay 9/10, offline 4/5 → completions .96/.95/.90/.80, weighted (.15·.96+.25·.95+.40·.90+.20·.80)/1.0 = 0.8915 → 89.
- [ ] 6.5 UI: toggles switch period & sort; self bar + blue self-row highlight render; no emoji present; tier badge colors correct; KPI dots show 实际/目标.
- [ ] 6.6 `npm run build` passes.
