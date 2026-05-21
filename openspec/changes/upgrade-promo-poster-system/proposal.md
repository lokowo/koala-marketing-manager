## Why

Sales agents need better poster customization to differentiate across channels and improve conversion. The current Canvas poster generator has limited templates (plain color blocks), no A/B variant testing, no size options, no toggle controls for QR/URL/referral code visibility, and no real-time preview. Additionally, users who manually enter referral codes during registration have no channel attribution — their traffic shows as "unknown", undermining analytics.

## What Changes

- Replace template selector with design-system-compliant cards showing color palette, font preview, button preview, and mini layout sketch
- Add A/B variant switching per template (two layout compositions sharing the same design principles)
- Build left-edit / right-preview poster editor with real-time Canvas rendering
- Add toggle controls: show QR code, show URL text, show referral code text, show channel badge
- Add size selector: 3:4 (1080×1440), 1:1 (1080×1080), 9:16 (1080×1920)
- Add seeded randomization for decorative elements (position offsets, count, gradient angle)
- Rewrite Canvas drawing with zone-based layout to prevent element overlap
- Render at 2x resolution for crisp PNG downloads
- Use `qrcode` npm package for client-side QR generation (replacing external API dependency)
- Add "从哪里知道我们？" channel selector on auth page when user manually enters referral code without channel info
- Update `/api/sales/attribute` to accept `manual_channel` from request body as fallback

## Capabilities

### New Capabilities
- `poster-canvas-engine`: Zone-based Canvas rendering engine with template/variant system, decoration randomization, toggle controls, and multi-size support
- `manual-channel-attribution`: Channel selection UI on auth page for manual referral code entry, plus API fallback in attribution endpoint

### Modified Capabilities
- `invite-poster-og`: Existing poster generation now replaced by the new Canvas engine in promo-center (the OG image API route remains unchanged for social sharing)

## Impact

- **Files modified**: `app/dashboard/sales/promo-center/page.tsx` (major rewrite of poster tab), `app/koala/auth/page.tsx` (add channel dropdown), `app/api/sales/attribute/route.ts` (accept body param)
- **New dependency**: `qrcode` npm package (client-side QR generation)
- **No database changes**: Uses existing `sales_referrals.channel` column
- **No breaking changes**: Promo links tab and QR tab remain unchanged; only the poster tab is rewritten
