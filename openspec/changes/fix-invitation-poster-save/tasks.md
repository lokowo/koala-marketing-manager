## Tasks

### Task 1: Fix html2canvas options and download flow

**File**: `app/components/SharePoster.tsx`

- Change `allowTaint: true` → `allowTaint: false`
- Add `await document.fonts.ready` before html2canvas call
- Fix desktop download: `document.body.appendChild(link)` before `link.click()`

### Task 2: Add Canvas API fallback

**File**: `app/components/SharePoster.tsx`

- Add `drawPosterFallback()` function that renders poster via Canvas 2D API
- Call fallback in catch block when html2canvas fails
- Fallback renders: header, display name, QR code, referral code, remaining invites, footer

### Verification

- `npm run build` passes
- Desktop: click 保存海报 → downloads PNG
- Mobile: click 保存海报 → shows full image for long-press save
