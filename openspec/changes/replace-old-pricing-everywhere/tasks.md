## Tasks

- [x] 1. Rewrite `/koala/tools/page.tsx` — replace legacy credit packages with CREDIT_PACKAGES from constants, wire purchase buttons to Stripe checkout, remove subscription tier section (kept only in /koala/pricing)
- [x] 2. Update `HomeClient.tsx` — replace "A$1/封起" with "积分制 · 低至 AUD 0.06/积分"
- [x] 3. Update `ProfessorDetailClient.tsx` — replace "(AUD 1)" with "(1 积分)"
- [x] 4. Update `chat/page.tsx` — fix credit insufficient message with link to pricing
- [x] 5. Update `test-ai-chat.ts` — remove "AUD 1" from test assertion
- [x] 6. Build verification — `npm run build` passes
