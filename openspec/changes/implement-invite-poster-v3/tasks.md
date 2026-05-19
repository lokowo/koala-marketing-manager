## 1. Font Preparation

- [ ] 1.1 Download Noto Sans SC Bold TTF and subset to GB2312 common characters (~3MB)
- [ ] 1.2 Place subsetted font at `assets/NotoSansSC-Bold.subset.ttf`

## 2. API Route Rewrite

- [ ] 2.1 Rename `app/api/invite-poster/route.ts` to `route.tsx` and replace with ImageResponse implementation
- [ ] 2.2 Load Noto Sans SC Bold font via `readFile` from `assets/` directory
- [ ] 2.3 Query Supabase for user info (display_name, initial, days since registration) from referral code
- [ ] 2.4 Generate QR code data URL using `qrcode` library for `https://www.koalaphd.com/koala/register?ref={code}`
- [ ] 2.5 Implement JSX template: green gradient background (#0D7C5F → #063D32), 750×1334
- [ ] 2.6 Implement top branding: Ola avatar circle + "Koala PhD" + domain
- [ ] 2.7 Implement user invite card: gold initial circle + "{name}同学邀请你加入" + "已使用 N 天"
- [ ] 2.8 Implement headline: "邀请好友 各得15积分" with gold accent + subtitle
- [ ] 2.9 Implement 4 feature rows with gold SVG icons and Chinese text
- [ ] 2.10 Implement QR code area: white rounded frame + "扫码注册" + referral code badge
- [ ] 2.11 Implement Ola welcome section: mascot SVG + speech bubble
- [ ] 2.12 Implement footer: "www.koalaphd.com" centered
- [ ] 2.13 Set Cache-Control headers: `public, max-age=3600, s-maxage=86400`

## 3. Verification

- [ ] 3.1 `npm run build` passes without errors
- [ ] 3.2 GET `/api/invite-poster?code=TEST` returns valid PNG image
- [ ] 3.3 Chinese text renders correctly (no tofu boxes)
- [ ] 3.4 QR code scans to correct registration URL
- [ ] 3.5 SharePoster modal displays the new poster correctly
