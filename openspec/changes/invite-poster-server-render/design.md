## Context

The invite poster is currently rendered client-side in `app/components/SharePoster.tsx` using DOM elements + html2canvas for screenshot. This breaks in WeChat's in-app browser and produces inconsistent results across devices. The existing referral system (codes, credit awards, tracking) works correctly and needs no changes.

Key files:
- `app/components/SharePoster.tsx` — current client-side poster (to be rewritten)
- `app/api/share/poster/route.ts` — returns poster metadata (referralCode, displayName, etc.)
- `app/koala/auth/page.tsx` — registration page, already handles `?ref=` param
- `app/api/auth/register/route.ts` — registration API, already processes referral codes

## Goals / Non-Goals

**Goals:**
- Server-render invite poster as PNG via next/og ImageResponse (750x1334)
- QR code generated server-side with `qrcode` library
- SharePoster component shows `<img>` from the API instead of DOM rendering
- Works reliably in WeChat, Safari, Chrome — user long-presses to save
- All roles (admin/sales/user) get their own branded poster

**Non-Goals:**
- Changing the referral tracking or credit system
- Adding new sharing channels (WeChat SDK, etc.)
- Changing poster access permissions or invite limits
- Removing html2canvas from ShareBar (separate component, untouched)

## Decisions

### 1. Use next/og ImageResponse (built into Next.js)

No extra dependency for image generation. `ImageResponse` uses Satori under the hood to render JSX to PNG. Supports custom fonts via fetch.

Alternative considered: Sharp/Canvas on server — heavier dependency, more complex setup.

### 2. Server-side QR with `qrcode` package

Already installed in the project (used client-side in SharePoster). Use `QRCode.toDataURL()` on the server to generate base64 PNG, embed directly in the ImageResponse JSX as `<img src={dataUrl}>`.

### 3. Poster design: brand green gradient

Per user spec: `#0D7C5F → #085544` gradient background, Koala branding, user name + avatar, 3 selling points, QR code, invite text. 750x1334 portrait format for mobile wallpaper/share.

### 4. Chinese font: Noto Sans SC from Google Fonts

Fetch the font file at request time (cached by Vercel's edge). Use Regular (400) weight — ImageResponse supports custom fonts via ArrayBuffer.

### 5. SharePoster becomes a thin wrapper

Replace the entire DOM poster + html2canvas logic with:
- `<img src="/api/og/invite?code={referralCode}" />` for display
- "长按图片保存到相册" hint text
- "复制链接" button (keep existing logic)
- Remove: posterRef, html2canvas import, drawPosterFallback, QRCode client-side generation

## Risks / Trade-offs

- **[Cold start latency]** First request to the OG route may take 2-3s (font fetch + image render). → Mitigation: font is cached after first fetch; subsequent requests are fast. Show loading state in SharePoster.
- **[Font file size]** Noto Sans SC is large (~9MB for full CJK). → Mitigation: Use the subset/regular weight file from Google Fonts CDN, which is split into smaller chunks. Fetch only the weight we need.
- **[Avatar fetch failure]** User avatar URL may be broken or CORS-blocked. → Mitigation: Graceful fallback to initial letter circle if avatar fetch fails.
