## Tasks

### Task 1: Create OG invite poster API route

**File**: `app/api/og/invite/route.tsx` (new)

- [x] Create `app/api/og/invite/route.tsx` with GET handler
- [x] Parse `?code=` query param, return 400 if missing
- [x] Query Supabase for user profile by invite code (join referral_codes → user_profiles)
- [x] Return 404 if code not found
- [x] Generate QR code server-side using `qrcode` library (`QRCode.toDataURL`)
- [x] Fetch Noto Sans SC font from Google Fonts CDN
- [x] Return `ImageResponse` with 750x1334 poster JSX:
  - Green gradient background (#0D7C5F → #085544)
  - Koala branding top section
  - User avatar (with fallback to initial letter) + "{displayName} 同学邀请你加入"
  - 3 selling point icons (AI匹配导师 / 24,000+教授库 / 一站式申请)
  - QR code image (200x200)
  - "扫码注册 各得15积分"
  - "koalaphd.com" footer

### Task 2: Rewrite SharePoster component

**File**: `app/components/SharePoster.tsx`

- [x] Remove html2canvas import and usage
- [x] Remove `drawPosterFallback` function
- [x] Remove client-side QRCode generation (useEffect with QRCode.toDataURL)
- [x] Remove `posterRef`, `qrDataUrl`, `generatedImageUrl` state
- [x] Replace poster DOM with `<img src="/api/og/invite?code={referralCode}" />`
- [x] Add loading skeleton/spinner while image loads
- [x] Show "长按图片保存到相册" hint below image
- [x] Keep "复制链接" button with existing clipboard logic
- [x] Keep modal open/close behavior and toast system

### Verification

- [x] `npm run build` passes
- [ ] GET `/api/og/invite?code=VALID_CODE` returns PNG image
- [ ] GET `/api/og/invite?code=INVALID` returns 404 JSON
- [ ] GET `/api/og/invite` (no code) returns 400 JSON
- [ ] SharePoster modal shows server-rendered image
- [ ] "复制链接" button works
