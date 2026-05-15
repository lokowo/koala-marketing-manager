## Tasks

- [x] 1. Extract `addCredits()` and `idempotentCheck()` from `app/api/webhooks/stripe/route.ts` into `app/lib/server/credits.ts`; update webhook to import from new location
- [x] 2. Create `POST /api/stripe/upgrade/preview/route.ts` — proration preview for upgrades, effective date for downgrades
- [x] 3. Create `POST /api/stripe/upgrade/confirm/route.ts` — execute plan switch with Stripe API, handle credits on upgrade
- [x] 4. Update `app/koala/pricing/page.tsx` — add upgrade/downgrade confirmation modals, improve button text ("升级到 X" / "降级到 X" / "当前方案")
- [x] 5. Build verification — `npm run build` passes
