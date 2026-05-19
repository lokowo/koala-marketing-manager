## Why

/api/og/invite route existed but had reliability issues: Google Fonts fetch could timeout in production (no timeout set), and font loading failure was unhandled (threw instead of degrading gracefully).

## What Changes

- Add local font file support (public/fonts/) as primary font source
- Add 5s timeout to all external fetches (Google Fonts, avatar)
- Gracefully degrade to sans-serif if no CJK font available
- Add timeout to avatar fetch to prevent hanging

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
(none)

## Impact

- `app/api/og/invite/route.tsx` — font loading and error handling
