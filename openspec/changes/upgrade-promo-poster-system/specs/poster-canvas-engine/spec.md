## poster-canvas-engine

### Purpose
Zone-based Canvas rendering engine for promotional posters with template/variant system, real-time preview, toggle controls, multi-size support, and seeded decoration randomization.

### Requirements

#### Template Selector
- MUST display 3 template cards (Minimal, Academic, Vibrant) as design-system-compliant cards
- Each card MUST show: 4-color palette strip, font preview (headline + body), button style preview (primary + secondary), mini layout sketch
- Each card MUST have A/B variant toggle tabs at bottom
- Selected card MUST have ring-2 ring-[#F59E0B] highlight

#### Template Definitions

**Minimal**
- Background: #FFFFFF
- Accent: #F59E0B, Text: #1E293B, Muted: #94A3B8
- Font: system sans-serif, title font-weight 300
- Decorations: max 2 geometric line elements
- Palette: #FFFFFF, #F59E0B, #1E293B, #94A3B8
- Recommended platforms: 微信, 邮件, WhatsApp

**Academic**
- Background: #0F172A
- Accent: #F59E0B, Text: #E2E8F0, Secondary: #3B82F6
- Font: title Georgia serif, body sans-serif
- Decorations: geometric lines, thin separators
- Palette: #0F172A, #F59E0B, #3B82F6, #E2E8F0
- Recommended platforms: 知乎, LinkedIn, 学术群

**Vibrant**
- Background: gradient (angle seeded 115°-155°), stops #F59E0B → #EC4899 (A) or #8B5CF6 → #EC4899 (B)
- Text: #FFFFFF, Accent: #FFFFFF
- Font: title bold 700, body sans-serif
- Decorations: circles, dots, glow effects (3-6 count, seeded)
- Palette: gradient, #FFFFFF, #8B5CF6, #FDE68A
- Recommended platforms: 小红书, 抖音, B站

#### A/B Variants
- Variant A: title top-center, QR/code bottom-right area, geometric decorations
- Variant B: title top-left, QR/code bottom-center, dot/circle decorations
- Both variants MUST respect the same template color/font rules

#### Editor Layout
- Left panel: all controls (template, variant, headline, subtitle, channel, toggles, size, buttons)
- Right panel: real-time Canvas preview, aspect-ratio-correct scaling
- On mobile (<md): stacked vertically, preview above controls
- Preview MUST update on every control change (no submit button needed for preview)

#### Toggle Controls
- Show QR code (default: on) — renders QR with URL `https://www.koalaphd.com/koala/auth?ref={code}&ch={channel}`
- Show URL text (default: off) — renders "www.koalaphd.com" in bottom info bar
- Show referral code (default: on) — renders "邀请码: {code}" text
- Show channel badge (default: on) — renders colored pill with "{渠道名}推广"
- When QR is OFF, the QR zone MUST show a referral code invitation box instead

#### Size Options
- 3:4 social media: 1080×1440 (default)
- 1:1 square: 1080×1080
- 9:16 vertical: 1080×1920

#### Canvas Rendering Rules
- ALL visible elements MUST be drawn on Canvas (no DOM overlays)
- Render at 2x device pixel ratio for retina-quality PNG export
- Zone-based layout: each element type has a fixed Y-range zone (percentage of height)
- Text MUST be measured with `ctx.measureText()` before drawing; auto-shrink font if exceeding zone width
- Elements MUST NOT overlap across zones
- Safe margin: 5% padding on all sides

#### Seeded Randomization
- Decorative elements (position offset ±10px, size ±15%, count 3-6, gradient angle ±20°) use seeded PRNG
- Seed derived from referralCode + timestamp
- "重新生成" button reseeds and re-renders (layout unchanged, details vary)

#### QR Code Generation
- Use `qrcode` npm package for client-side generation (no external API calls)
- QR content: `https://www.koalaphd.com/koala/auth?ref={code}&ch={channel}`
- White rounded-rect background behind QR code

#### Download
- "下载 PNG" exports canvas as PNG via `toDataURL('image/png')`
- Filename: `koala-poster-{template}-{variant}-{code}-{channel}.png`

### Boundaries
- Only applies to the poster tab in promo-center; link tab and QR tab are unchanged
- Does not modify the `/api/invite-poster` OG image route
- Does not affect the `SharePoster.tsx` component used in user profile
