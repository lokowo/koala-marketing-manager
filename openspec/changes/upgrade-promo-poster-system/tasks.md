## Tasks

### Setup
- [x] Install `qrcode` package: `npm install qrcode @types/qrcode`

### Poster Canvas Engine (`lib/poster-engine.ts`)
- [x] Create `app/lib/poster-engine.ts` with types: `PosterOptions`, `TemplateConfig`, `Zone`
- [x] Implement zone calculator: percentage-based Y ranges for logo/title/subtitle/qrArea/infoBar zones, scaled by canvas dimensions
- [x] Implement seeded PRNG utility (`seededRandom`) and `hashCode` for seed generation from referralCode + timestamp
- [x] Implement `roundRect` helper, `wrapText` helper, `fitText` (auto-shrink font to max width)
- [x] Define 3 `TemplateConfig` objects (minimal, academic, vibrant) with colors, fonts, decoration style
- [x] Implement `drawBackground()` — solid fill for minimal/academic, seeded-angle gradient for vibrant
- [x] Implement `drawDecorations()` — geometric lines (A) or dots/circles (B), count and position seeded
- [x] Implement `drawLogo()` — "Koala PhD 考拉博士" text mark at logo zone
- [x] Implement `drawHeadline()` and `drawSubtitle()` — auto-shrink text, template-specific font/color/alignment (centered for A, left for B)
- [x] Implement `drawQRCode()` — uses `qrcode` package to generate dataURL, draws white rounded-rect background + QR image
- [x] Implement `drawRefCodeBox()` — styled invitation box with "🎁 注册输入邀请码" + code + "领取免费积分" (used when QR is off)
- [x] Implement `drawChannelBadge()` — colored pill with channel name, right-aligned in info bar zone
- [x] Implement `drawUrlText()` and `drawRefCodeLabel()` — left-aligned in info bar zone, stacked vertically if both visible
- [x] Implement `drawCaptionLine()` — "扫码注册 · {渠道名}渠道" below QR code
- [x] Implement main `renderPoster(canvas, options)` orchestrator that calls all draw functions in correct order with 2x scaling

### Template Selector Cards (promo-center UI)
- [x] Replace existing template grid with design-system card components: each card shows 4-color palette strip (left), font preview Aa (right top), button preview (middle), mini layout bars (bottom), template name + description + recommended platform tags
- [x] Add A/B variant toggle tabs at bottom of each template card
- [x] Wire template + variant selection to poster options state

### Poster Editor UI (promo-center page.tsx — poster tab rewrite)
- [x] Build left-right layout: left panel (controls), right panel (canvas preview). Stack on mobile.
- [x] Left panel: headline input (default "用 AI 找到你的理想 PhD 导师"), subtitle input (optional, default "澳洲八大名校 · 4000+ 教授")
- [x] Left panel: channel selector dropdown (reuse existing CHANNELS array)
- [x] Left panel: 4 toggle switches — show QR (default on), show URL (default off), show referral code (default on), show channel badge (default on)
- [x] Left panel: size radio group — 3:4 (default), 1:1, 9:16
- [x] Left panel: "重新生成" button (reseeds randomization) + "下载 PNG" button
- [x] Right panel: preview canvas element, scaled to fit container maintaining aspect ratio
- [x] Wire all controls to trigger `renderPoster()` on change via useEffect
- [x] Implement download: export canvas as PNG with filename `koala-poster-{template}-{variant}-{code}-{channel}.png`
- [x] Remove old `generatePoster` callback, old `POSTER_TEMPLATES` array, and old canvas ref logic

### Manual Channel Attribution (auth page)
- [x] Add `manualChannel` state to `AuthPageInner` component
- [x] Compute `isManualRef`: referralInput has value AND no channel from URL param AND no channel from cookie
- [x] Render channel `<select>` dropdown below referral code input when `isManualRef` is true
- [x] Pass `manualChannel` to `/api/sales/attribute` call: change `fetch('/api/sales/attribute', { method: 'POST' })` to send JSON body `{ manual_channel: manualChannel }` with Content-Type header

### Attribution API Update
- [x] In `app/api/sales/attribute/route.ts`: parse optional JSON body to extract `manual_channel`
- [x] Change channel resolution: `const channel = refData.ch || body?.manual_channel || 'unknown';`

### Verification
- [x] `npm run build` passes with no errors
- [ ] All 3 templates render correctly in each variant (6 combinations)
- [ ] All 4 toggle combinations produce correct poster output
- [ ] All 3 size options produce correct dimensions
- [ ] "重新生成" changes decoration details but not layout
- [ ] Downloaded PNG is 2x resolution and includes all Canvas-drawn elements
- [x] Auth page shows channel dropdown only when manual referral code is entered without channel context
- [x] Attribution API correctly uses manual_channel when cookie has no ch
