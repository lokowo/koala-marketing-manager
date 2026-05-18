## Why

Current invite poster is rendered client-side with html2canvas, which fails on many mobile browsers (especially WeChat's in-app browser) and produces inconsistent results across devices. Server-side rendering via next/og produces a reliable PNG that works everywhere -- users can long-press to save in any browser/app, and the image is cacheable. This also eliminates the html2canvas dependency.

## What Changes

- New API route `app/api/og/invite/route.tsx` that generates a 750x1334 PNG poster using `ImageResponse` (next/og), with the user's name, avatar, and a QR code for their invite link
- Install `qrcode` package for server-side QR code generation as base64 PNG
- Rewrite `app/components/SharePoster.tsx` to display the server-rendered `<img>` instead of DOM-based poster + html2canvas screenshot
- Remove html2canvas dependency from SharePoster (keep in ShareBar if still used)
- Confirm existing referral tracking (`ref=` param on register page, credit awards) works end-to-end

## Capabilities

### New Capabilities
- `og-invite-poster`: Server-side invite poster generation via next/og ImageResponse, returning a branded PNG with user info and QR code

### Modified Capabilities
(none -- referral tracking and credit system remain unchanged, only the poster rendering method changes)

## Impact

- **New file**: `app/api/og/invite/route.tsx`
- **Modified file**: `app/components/SharePoster.tsx` (replace DOM rendering + html2canvas with `<img>` tag)
- **Dependencies**: Add `qrcode` (server-side QR generation); html2canvas remains for ShareBar but removed from SharePoster
- **Existing APIs unchanged**: `/api/share/poster`, `/api/user/referral/claim`, `/api/auth/register` -- no changes needed
- **All roles**: Admin, Sales, and regular users all use the same poster endpoint with their own invite code
