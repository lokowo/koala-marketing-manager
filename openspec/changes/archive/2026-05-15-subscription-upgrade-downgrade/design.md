## Architecture

### New files
- `app/lib/server/credits.ts` — extracted `addCredits()` + `idempotentCheck()` shared by webhook and upgrade/confirm
- `app/api/stripe/upgrade/preview/route.ts` — POST: proration preview
- `app/api/stripe/upgrade/confirm/route.ts` — POST: execute plan switch

### Modified files
- `app/api/webhooks/stripe/route.ts` — import `addCredits` from shared module instead of local definition
- `app/koala/pricing/page.tsx` — add upgrade/downgrade modals, improved button text

## Data flow

### Upgrade (target price > current price)
1. Frontend calls `/api/stripe/upgrade/preview` with `targetTierId`
2. Backend fetches user's active subscription, calls `stripe.invoices.createPreview()` for proration
3. Returns proration amount, credit diff, confirms immediate effect
4. User confirms → frontend calls `/api/stripe/upgrade/confirm`
5. Backend calls `stripe.subscriptions.update()` with `proration_behavior: 'create_prorations'`
6. Backend immediately adds credit diff via `addCredits()`
7. Backend updates `subscriptions.tier` and `user_profiles.plan_type`
8. Webhook `handleSubscriptionUpdated` provides final consistency

### Downgrade (target price < current price)
1. Frontend calls `/api/stripe/upgrade/preview` with `targetTierId`
2. Backend returns effective date (current_period_end), no proration
3. User confirms → frontend calls `/api/stripe/upgrade/confirm`
4. Backend calls `stripe.subscriptions.update()` with `proration_behavior: 'none'`
5. Stripe schedules the price change for next billing cycle
6. No immediate DB changes — webhook `handleSubscriptionUpdated` handles it when Stripe fires the event at period end

## Key decisions
- **No new DB columns**: Stripe's `schedule` handles pending downgrades natively; no `pending_downgrade_tier` column needed
- **Credit diff on upgrade only**: Upgrade immediately adds `targetCredits - currentCredits`; downgrade never touches credits
- **Idempotent credit add**: Uses `referenceId = upgrade_{subscriptionId}_{targetTier}_{timestamp}` to prevent double-add
- **Auth**: Both endpoints require authenticated user via `getServerUser()`
