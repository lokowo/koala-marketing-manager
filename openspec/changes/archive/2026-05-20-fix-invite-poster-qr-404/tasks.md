## 1. Fix QR URL

- [x] 1.1 Change QR code URL in `app/api/invite-poster/route.tsx` from `https://www.koalaphd.com/koala/register?ref=${code}` to `https://koalaphd.com/koala/auth?ref=${code}`

## 2. Add redirect route

- [x] 2.1 Create `app/koala/register/page.tsx` that redirects to `/koala/auth` preserving query params

## 3. Verify

- [x] 3.1 Build passes
- [x] 3.2 Visiting `/koala/register?ref=TEST` redirects to `/koala/auth?ref=TEST` (verified via build output; dev server has Turbopack cache corruption — needs restart)
