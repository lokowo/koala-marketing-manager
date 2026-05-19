## Why

The current invite poster (v2, sharp + SVG text) has minimal design — plain sans-serif text, no Chinese font rendering, no Ola mascot, no feature highlights. The poster doesn't communicate product value or brand identity. Users are less likely to share a generic-looking poster. Switching to `@vercel/og` ImageResponse with proper Noto Sans SC font loading enables a rich, branded Chinese-language poster that matches the design spec.

## What Changes

- **Replace** `app/api/invite-poster/route.ts` — rewrite from sharp/SVG to `@vercel/og` ImageResponse with JSX + inline styles
- **Add Chinese font** — fetch Noto Sans SC 700 font in the handler, pass to ImageResponse fonts option
- **Rich design** (750×1334) — green gradient background, Ola mascot SVG, user invite card with gold avatar + days-since-registration, "邀请好友 各得15积分" headline, 4 feature rows with gold icons, QR code in white rounded frame, Ola welcome bubble, footer
- **User info from Supabase** — query nickname, avatar initial, registration days from referral code; fallback to defaults
- **QR code** — generate via `qrcode` library pointing to `koalaphd.com/koala/register?ref={code}`
- **Keep `SharePoster.tsx` frontend** — already points to `/api/invite-poster?code=`, just update if needed

## Capabilities

### New Capabilities
- `invite-poster-og`: Server-rendered invite poster using @vercel/og ImageResponse with Chinese font, Ola branding, QR code, user personalization, and 4 feature highlights

### Modified Capabilities
(none — replacing implementation, not changing spec-level behavior of other capabilities)

## Impact

- **Replaced file**: `app/api/invite-poster/route.ts` — complete rewrite from sharp to @vercel/og
- **Dependency**: `@vercel/og` (may already be present via next/og; verify)
- **Dependency**: `qrcode` (already installed)
- **Font**: Runtime fetch of Noto Sans SC 700 from Google Fonts CDN (adds ~2MB to cold-start, cached after)
- **Frontend**: `app/components/SharePoster.tsx` — no changes expected (already uses correct endpoint)
- **No new routes** — same GET `/api/invite-poster?code=XXX` contract
