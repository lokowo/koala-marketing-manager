import { Font } from '@react-pdf/renderer';

export const CJK_FONT = 'NotoSansSC';
const FALLBACK_FONT = 'Helvetica';

function extractNonLatinChars(text: string): string {
  const chars = new Set<string>();
  for (const c of text) {
    const code = c.charCodeAt(0);
    if (code > 0x7f) chars.add(c);
  }
  return Array.from(chars).join('');
}

export async function registerPdfFonts(content: string): Promise<string> {
  const nonLatin = extractNonLatinChars(content);
  if (nonLatin.length === 0) return FALLBACK_FONT;

  try {
    Font.clear();

    const textParam = encodeURIComponent(nonLatin);
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&text=${textParam}`;
    const cssRes = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!cssRes.ok) return FALLBACK_FONT;
    const css = await cssRes.text();

    const fonts: { fontWeight: number; src: string }[] = [];
    for (const block of css.split('@font-face')) {
      const wm = block.match(/font-weight:\s*(\d+)/);
      const um = block.match(/url\(([^)]+)\)/);
      if (wm && um) fonts.push({ fontWeight: parseInt(wm[1]), src: um[1] });
    }

    if (fonts.length === 0) return FALLBACK_FONT;

    Font.register({ family: CJK_FONT, fonts });
    return CJK_FONT;
  } catch (e) {
    console.warn('[pdf-fonts] CJK font registration failed, using fallback:', e);
    return FALLBACK_FONT;
  }
}
