## Why

Users hitting "保存海报" in the invitation poster flow get "截图失败，请手动截屏或复制链接". html2canvas fails silently in some browser environments (iOS Safari, WeChat browser), with no fallback.

## What Changes

- Fix `allowTaint: true` conflicting with `useCORS: true` in html2canvas options (tainted canvas can't call toDataURL)
- Add `document.fonts.ready` wait before capture
- Add Canvas API fallback when html2canvas fails entirely
- Fix desktop download by properly appending link to DOM before click

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
(none)

## Impact

- `app/components/SharePoster.tsx` — handleSave function + new fallback renderer
