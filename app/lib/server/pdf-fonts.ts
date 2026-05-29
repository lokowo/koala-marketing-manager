import { Font } from '@react-pdf/renderer';

export const CJK_FONT = 'NotoSansSC';
const FALLBACK_FONT = 'Helvetica';

// Safari 5 UA → Google Fonts returns WOFF (supported by fontkit)
const UA_WOFF = 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50';

// Valid sfnt signatures: TrueType (00 01 00 00), TrueType ('true'), OpenType ('OTTO'),
// TTC ('ttcf'), WOFF (wOFF)
const VALID_SIGNATURES = new Set([
  0x00010000, // TrueType
  0x74727565, // 'true'
  0x4f54544f, // 'OTTO'
  0x74746366, // 'ttcf'
  0x774f4646, // 'wOFF'
]);

function isValidFontBinary(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false;
  const sig = new DataView(buf).getUint32(0);
  return VALID_SIGNATURES.has(sig);
}

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

    const fonts: { fontWeight: number; url: string }[] = [];
    for (const block of css.split('@font-face')) {
      const wm = block.match(/font-weight:\s*(\d+)/);
      const um = block.match(/url\(([^)]+)\)/);
      if (!wm || !um) continue;
      const url = um[1];
      // Skip woff2 — fontkit cannot decode it
      if (url.includes('.woff2')) continue;
      const weight = parseInt(wm[1]);
      if (!fonts.some(f => f.fontWeight === weight)) {
        fonts.push({ fontWeight: weight, url });
      }
    }

    if (fonts.length === 0) {
      console.error('[pdf-fonts] No usable (ttf/woff) font URLs found in CSS');
      return FALLBACK_FONT;
    }

    const registrations: { fontWeight: number; src: string }[] = [];
    for (const f of fonts) {
      const res = await fetch(f.url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        console.error('[pdf-fonts] Font fetch failed:', res.status, f.url);
        continue;
      }
      const buf = await res.arrayBuffer();
      if (!isValidFontBinary(buf)) {
        console.error('[pdf-fonts] Invalid sfnt signature for', f.url,
          '| first 4 bytes:', Buffer.from(buf.slice(0, 4)).toString('hex'));
        continue;
      }
      const b64 = Buffer.from(buf).toString('base64');
      const mime = f.url.includes('.woff') ? 'font/woff' : 'font/truetype';
      registrations.push({ fontWeight: f.fontWeight, src: `data:${mime};base64,${b64}` });
    }

    if (registrations.length === 0) {
      console.error('[pdf-fonts] All font downloads failed or invalid');
      return FALLBACK_FONT;
    }

    Font.register({
      family: CJK_FONT,
      fonts: registrations.map((r) => ({ src: r.src, fontWeight: r.fontWeight })),
    });

    return CJK_FONT;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[pdf-fonts] CJK font registration failed:', err.message, '\n', err.stack);
    return FALLBACK_FONT;
  }
}
