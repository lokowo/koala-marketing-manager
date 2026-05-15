## 1. safeLimit wrapper

- [x] 1.1 Add `safeLimit()` function to `app/lib/ratelimit.ts`

## 2. Replace limiter calls in all routes

- [x] 2.1 aiLimiter routes (13 files)
- [x] 2.2 authLimiter routes (3 files)
- [x] 2.3 surveySubmitLimiter routes (2 files)
- [x] 2.4 deepSearchLimiter + urlImportLimiter routes (2 files)

## 3. Stripe checkout error handling

- [x] 3.1 Add Stripe error classification in checkout route

## 4. Blog generate maxDuration + cover fix

- [x] 4.1 Add maxDuration config for blog routes in vercel.json
- [x] 4.2 Fix response_format in generate-cover route

## 5. Verify

- [x] 5.1 npm run build passes
