## Root Cause

html2canvas config had `allowTaint: true` + `useCORS: true`. When `allowTaint` is true, cross-origin resources taint the canvas and `toDataURL()` throws SecurityError. Even though the poster only uses data URLs currently, html2canvas may internally load resources that trigger this.

Additional issues:
- No font loading wait — canvas may capture before fonts render
- Desktop `link.click()` without DOM attachment fails in some browsers

## Fix

1. Set `allowTaint: false` so `useCORS: true` works correctly
2. `await document.fonts.ready` before capture
3. Append download link to DOM before click, remove after
4. Add pure Canvas API fallback (`drawPosterFallback`) that recreates the poster layout when html2canvas fails entirely
