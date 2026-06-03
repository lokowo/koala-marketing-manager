## Why

The Sales dashboard team ranking (`app/dashboard/sales/page.tsx`, section C) currently ranks agents **only by monthly commission**, shows the top 5, and uses emoji medals (🥇🥈🥉) — which violates DESIGN.md ("彩色 emoji 作为功能图标" is an anti-pattern). It tells a sales rep nothing about how they are tracking against their KPI targets, only about raw dollars. A rep who is crushing their visit/registration/payment targets but earns less commission than a partner appears "behind", and there is no way to see the team's overall KPI achievement, no week-vs-month view, and no per-agent KPI breakdown.

This change adds a **「KPI 综合达成率」** ranking (a single weighted achievement number per agent across the 4 funnel KPIs) alongside the existing **「本月佣金」** ranking, with a **本周 / 本月** time toggle, while keeping the current commission ranking fully intact.

## What Changes

- `app/api/sales/dashboard-stats/route.ts`
  - Accept query params `?period=week|month` and `?sort=rate|commission` (default `month` / `rate`).
  - Compute, for **every active sales agent** (partners included), the 4 funnel KPI actuals (访问 / 注册 / 付费 / 线下) and their current-effective targets for the selected period, plus monthly commission and all-time cumulative commission.
  - Compute each agent's **综合达成率** = weighted average of per-KPI completion (访问0.15 / 注册0.25 / 付费0.40 / 线下0.20), with zero-target KPIs dropped + weights renormalized, and each KPI completion capped at 150%.
  - Return a new full ranking array (`team_ranking_full`) with every agent's fields, ranked by the selected sort; keep the existing `team_ranking` field unchanged for backward compatibility.
- `app/dashboard/sales/page.tsx`
  - Replace the team-ranking card body with: a **period toggle (本周/本月)** + **sort toggle (综合达成率/本月佣金)**, a **self bar** (「你当前第N名/共M人 · 综合达成率X%」), and a richer **per-agent row** (rank badge with crown icon + medal-color circle, display_name + referral_code + tier, 本月佣金 green / 累计佣金 grey, 综合达成率 large, and 4 KPI color-dot 「实际/目标」 chips).
  - Remove emoji medals; use a Tabler `IconCrown` + colored circles. Agents with no targets are labelled 「未设目标」 and sorted last (not ranked by rate).

## Capabilities

### New Capabilities
- `sales-team-ranking`: Dual-mode (达成率 / 本月佣金) team ranking with 本周/本月 toggle, comprehensive KPI achievement-rate algorithm, self-position bar, and per-agent KPI breakdown rows on the Sales dashboard.

### Modified Capabilities
_None — `sales-kpi-cards` (the 4 KPI cards) is untouched; this adds a new ranking capability._

## Impact

- `app/api/sales/dashboard-stats/route.ts` — adds query-param handling + per-agent KPI/achievement aggregation + `team_ranking_full` in the response. Existing fields (`kpi`, `funnel`, `team_ranking`, legacy blocks) unchanged.
- `app/dashboard/sales/page.tsx` — team-ranking card rewritten; all other sections (welcome bar, KPI cards, trend chart, channels, funnel, recent commissions, quick promo) untouched.
- No database changes (reads existing `sales_agents`, `sales_visits`, `sales_referrals`, `sales_commissions`, `sales_kpi_targets`).
- No new npm dependencies (`@tabler/icons-react` already installed; `IconCrown` available there).
- Weights are hard-coded (not configurable) per the request. Display-name editing is out of scope.
