## Context

The current invite poster at `app/api/invite-poster/route.ts` uses sharp + raw SVG text to render a 750×1334 PNG. It's English-only, has no Chinese font, no Ola mascot, no feature highlights — it's a placeholder that doesn't drive sharing. The `SharePoster.tsx` frontend component already points to this endpoint and handles save/copy.

Next.js 16 ships `ImageResponse` from `next/og` (Satori-based). It accepts JSX + inline styles and outputs PNG. This is the recommended approach for dynamic image generation on Vercel — no need for sharp as a runtime dependency for this route.

## Goals / Non-Goals

**Goals:**
- Rich branded poster matching the design spec: green gradient, Ola mascot, gold accents, Chinese text, QR code, 4 feature rows
- Proper Chinese font rendering via Noto Sans SC 700
- User personalization: name, avatar initial, registration days
- Same API contract: GET `/api/invite-poster?code=XXX` → PNG

**Non-Goals:**
- Animated poster / video
- Multiple poster templates or themes
- Social sharing API integration (frontend already handles copy/save)
- Removing sharp from the project (used elsewhere)

## Decisions

### 1. ImageResponse from `next/og` instead of sharp + SVG

**Choice**: Use `import { ImageResponse } from 'next/og'` with JSX + inline styles.

**Why**: Satori renders JSX to SVG then to PNG natively. It supports flexbox layout, making the complex poster design much easier to maintain than hand-crafted SVG coordinate math. Next.js 16 bundles it — no extra dependency.

**Alternative considered**: Keep sharp + improve SVG. Rejected because SVG `<text>` can't do flexbox layout, word wrapping, or auto-sizing — the design spec has too many layout elements.

### 2. Font loading strategy: bundled .ttf file

**Choice**: Bundle a subset of Noto Sans SC Bold as a .ttf file at `assets/NotoSansSC-Bold.subset.ttf` (~2-4MB covering CJK common chars), loaded via `readFile(join(process.cwd(), 'assets/...'))`.

**Why**: 
- Google Fonts CDN returns `.woff2` which Satori does NOT support (only ttf/otf/woff)
- Fetching from a remote URL adds latency and can timeout on cold starts
- A bundled file is loaded from local disk on every invocation — fast and reliable

**Alternative considered**: Fetch font from Google Fonts at runtime. Rejected because (a) `.woff2` format is incompatible, (b) network dependency adds failure mode, (c) ImageResponse has 500KB bundle limit but font is loaded at runtime via `readFile` so it doesn't count toward the limit.

**Subset approach**: Use `pyftsubset` or `fonttools` to trim Noto Sans SC Bold from ~16MB to ~3MB covering GB2312 common characters. This keeps cold start reasonable.

### 3. QR code as data URL embedded in `<img>`

**Choice**: Generate QR code using the existing `qrcode` library as a data URL (base64 PNG), then embed as `<img src={dataUrl} />` inside the JSX.

**Why**: Satori supports `<img>` with data URLs. This avoids writing QR as SVG paths which is complex. The `qrcode` package is already installed.

### 4. SVG icons inline in JSX

**Choice**: Embed the 4 feature icons (search, envelope, document, book) and Ola mascot as inline SVG within the JSX using `<svg>` elements.

**Why**: Satori supports basic SVG elements inside JSX. External image files would need to be loaded as data URLs adding complexity. Simple icon shapes can be drawn with a few `<path>` elements.

### 5. Keep the same route path

**Choice**: Replace `app/api/invite-poster/route.ts` in-place. Same GET contract, same query param.

**Why**: `SharePoster.tsx` already calls this endpoint. No frontend changes needed.

## Risks / Trade-offs

**[Risk] Satori CSS subset may not support all design elements** → Mitigation: stick to flexbox, absolute positioning, border-radius, linear-gradient, opacity. Test each layout section individually. Satori docs list supported properties.

**[Risk] Font file size (~3MB) increases cold start** → Mitigation: use font subsetting to minimize. Response is cached (`Cache-Control: public, max-age=3600, s-maxage=86400`). Vercel Fluid Compute reuses function instances so cold starts are infrequent.

**[Risk] 750×1334 is large for ImageResponse** → Mitigation: This is within Satori's capabilities. The og-playground demo supports custom sizes. Add `Cache-Control` headers to avoid re-generation.

**[Risk] QR code readability at poster size** → Mitigation: QR area is 200×200px within the 750px-wide poster — sufficient for simple URL. Use error correction level M.
