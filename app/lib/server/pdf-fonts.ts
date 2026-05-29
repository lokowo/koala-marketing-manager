import { Font } from '@react-pdf/renderer';

export const CJK_FONT = 'NotoSansSC';
const FALLBACK_FONT = 'Helvetica';

// Safari 5 UA → Google Fonts returns WOFF (supported by fontkit)
const UA_WOFF = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50';

export async function registerPdfFonts(content: string): Promise<string> {
  const hasNonLatin = /[^\x00-\x7f]/.test(content);
  if (!hasNonLatin) return FALLBACK_FONT;

  try {

    const cssUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700';
    const cssRes = await fetch(cssUrl, {
      headers: { 'User-Agent': UA_WOFF },
      signal: AbortSignal.timeout(10000),
    });
    if (!cssRes.ok) {
      console.error('[pdf-fonts] Google Fonts CSS fetch failed:', cssRes.status);
      return FALLBACK_FONT;
    }
    const css = await cssRes.text();

    // Parse @font-face blocks — one per weight for full Noto Sans SC
    const fonts: { fontWeight: number; url: string }[] = [];
    for (const block of css.split('@font-face')) {
      const wm = block.match(/font-weight:\s*(\d+)/);
      const um = block.match(/url\(([^)]+)\)/);
      if (wm && um) {
        const weight = parseInt(wm[1]);
        if (!fonts.some(f => f.fontWeight === weight)) {
          fonts.push({ fontWeight: weight, url: um[1] });
        }
      }
    }

    if (fonts.length === 0) {
      console.error('[pdf-fonts] No font URLs found in Google Fonts CSS');
      return FALLBACK_FONT;
    }

    // Pre-fetch font binaries and convert to data URIs for reliability
    const registrations = await Promise.all(
      fonts.map(async (f) => {
        const res = await fetch(f.url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`Font fetch failed: ${res.status} for ${f.url}`);
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString('base64');
        const mime = f.url.includes('.woff2') ? 'font/woff2'
          : f.url.includes('.woff') ? 'font/woff'
          : 'font/truetype';
        return { fontWeight: f.fontWeight, src: `data:${mime};base64,${b64}` };
      })
    );

    Font.register({
      family: CJK_FONT,
      fonts: registrations.map((r) => ({
        src: r.src,
        fontWeight: r.fontWeight,
      })),
    });

    return CJK_FONT;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[pdf-fonts] CJK font registration failed:', err.message, '\n', err.stack);
    return FALLBACK_FONT;
  }
}
