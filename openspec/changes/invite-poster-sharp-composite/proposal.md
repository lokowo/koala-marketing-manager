## Why

The current `/api/og/invite` route uses `next/og` (Satori) which requires CJK font loading — this is fragile (Google Fonts timeout, no local font bundled) and fails silently in production. Sharp is already installed and runs natively on Vercel without font dependencies.

## What Changes

- New `/api/invite-poster/route.ts` using sharp to composite: SVG background + QR code + user name text overlay
- Update `SharePoster.tsx` to point to new endpoint
- Keep old `/api/og/invite` for backwards compatibility but frontend switches to new route

## Capabilities

### New Capabilities
(none — replacing implementation of existing feature)

### Modified Capabilities
(none)

## Impact

- New file: `app/api/invite-poster/route.ts`
- Modified: `app/components/SharePoster.tsx` (change API endpoint)
