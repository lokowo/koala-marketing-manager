## Tasks

### Task 1: Create /api/invite-poster/route.ts

- sharp composite: SVG background (750×1334 green gradient with text) + QR code buffer
- Query user display name from Supabase by referral code
- SVG renders all Chinese text natively (no font file needed)
- QR code via qrcode.toBuffer() composited onto background
- Return PNG with cache headers

### Task 2: Update SharePoster.tsx

- Change poster API from `/api/og/invite` to `/api/invite-poster`
- Same save/download logic

### Verification

- /api/invite-poster?code=TEST returns PNG image (with fallback for unknown code)
- Build passes
