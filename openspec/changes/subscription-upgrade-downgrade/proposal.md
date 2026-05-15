## Why

Users clicking upgrade/downgrade buttons on `/koala/pricing` are sent to the generic Stripe Customer Portal, which only shows billing history — they cannot actually switch plans. We need a native upgrade/downgrade flow with proration preview, immediate credit adjustment, and clear confirmation UX.

## What Changes

- **New API: `POST /api/stripe/upgrade/preview`** — returns proration amount (upgrade) or effective date (downgrade) for a target tier
- **New API: `POST /api/stripe/upgrade/confirm`** — executes subscription change: immediate proration + credit diff for upgrades, end-of-period switch for downgrades
- **Extract `addCredits()` into shared utility** — currently private in webhooks/stripe/route.ts, needed by confirm endpoint
- **Upgrade/downgrade confirmation modals** in pricing/page.tsx with full cost breakdown
- **Button text optimization** — "升级到 Pro" / "降级到 Starter" / "当前方案" / "开始 X 订阅"

## Capabilities

### New Capabilities
- `subscription-plan-switch`: Preview and execute subscription tier upgrades/downgrades with proration handling and credit adjustment

### Modified Capabilities
- `stripe-subscription`: Add plan switching behavior (upgrade with proration, downgrade at period end, credit diff on upgrade)

## Impact

- **New files**: `app/api/stripe/upgrade/preview/route.ts`, `app/api/stripe/upgrade/confirm/route.ts`, `app/lib/server/credits.ts`
- **Modified files**: `app/api/webhooks/stripe/route.ts` (extract addCredits), `app/koala/pricing/page.tsx` (modals + button text)
- **Stripe API**: Uses `invoices.createPreview()`, `subscriptions.update()` with proration
- **Database**: Reads/writes `subscriptions`, `user_profiles`, `credit_transactions`
