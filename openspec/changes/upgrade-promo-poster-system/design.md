## Architecture

### Component Structure

The poster tab in `promo-center/page.tsx` is rewritten as a left-right editor layout. A new utility module `lib/poster-engine.ts` encapsulates all Canvas drawing logic.

```
promo-center/page.tsx
├── Tab 1: 推广链接 (unchanged)
├── Tab 2: 推广二维码 (unchanged)
└── Tab 3: 推广海报 (rewritten)
    ├── Left panel: PosterEditor controls
    │   ├── Template selector (3 cards with A/B toggle)
    │   ├── Text inputs (headline, subtitle)
    │   ├── Channel selector
    │   ├── Toggle switches (QR, URL, refCode, channelBadge)
    │   └── Size selector + action buttons
    └── Right panel: Canvas real-time preview
        └── Calls renderPoster() on every option change

lib/poster-engine.ts (new file)
├── renderPoster(ctx, options) — main orchestrator
├── Zone calculator — percentage-based layout regions
├── drawBackground() — solid/gradient per template
├── drawDecorations() — seeded random decorative elements
├── drawHeadline() / drawSubtitle() — auto-shrink text
├── drawQRCode() — uses `qrcode` package
├── drawRefCodeBox() — fallback when QR is off
├── drawChannelBadge() — colored pill, right-aligned
├── drawUrlText() / drawRefCodeLabel() — bottom info bar
└── Utility: roundRect, wrapText, loadImage, seededRandom

app/koala/auth/page.tsx
└── Add manualChannel state + <select> below referral input
    (visible only when referralInput is filled AND no channel from URL/cookie)

app/api/sales/attribute/route.ts
└── Read optional manual_channel from request body as channel fallback
```

### Template System

Three templates, each with A and B variants (6 total compositions). All share a zone-based layout system.

| Zone | Y range | Content |
|------|---------|---------|
| Logo | 3% | Koala PhD text mark |
| Title | 20-40% | Headline + subtitle |
| Middle | 40-55% | Decorative whitespace |
| QR/Code | 55-75% | QR code or referral code box |
| Info bar | 80-93% | URL, ref code text, channel badge |
| Safe margin | 5% all sides | No content |

**Variant A**: Title centered, QR bottom-right, geometric line decorations
**Variant B**: Title left-aligned, QR bottom-center, dot/circle decorations

### Size System

All sizes use width=1080, height varies. Canvas renders at 2x for retina clarity.

- `3:4` → 1080×1440 (default, social media)
- `1:1` → 1080×1080 (square, WeChat moments)
- `9:16` → 1080×1920 (vertical, stories/reels)

### Seeded Randomization

Decorative elements use a seeded PRNG based on `referralCode + timestamp`. Clicking "重新生成" reseeds. This gives slight variation between generates while keeping the composition deterministic within a single render.

## Key Decisions

1. **Client-side QR generation** via `qrcode` npm package instead of external API (`api.qrserver.com`). Eliminates network dependency and CORS issues. The existing QR tab still uses the external API for simplicity — only the poster Canvas switches.

2. **Single file for Canvas engine** (`lib/poster-engine.ts`) rather than splitting per template. The templates share 90% of drawing code; only background, colors, font choices, and decoration style differ. A `TemplateConfig` object per template keeps it clean.

3. **No server-side rendering** for posters. Everything runs in-browser Canvas. The existing `/api/invite-poster` OG image route is left unchanged for social sharing metadata.

4. **Manual channel attribution** uses request body, not cookies. When a user types a referral code manually and selects a channel, the auth page sends `manual_channel` in the POST body to `/api/sales/attribute`. The API prefers cookie `ch` over body `manual_channel` to avoid spoofing from QR-scanned users.

## Risks

- **Canvas font rendering**: System fonts may look different across OS. We use `system-ui, sans-serif` for consistency. Serif for Academic template uses `Georgia, serif` which is available on all major platforms.
- **QR package size**: `qrcode` adds ~40KB gzipped. Acceptable for a sales tool page that's not on the critical path.
- **Canvas `roundRect` support**: Available in all modern browsers (Chrome 99+, Safari 15.4+, Firefox 112+). Our user base is sales agents on recent devices, so this is fine.
