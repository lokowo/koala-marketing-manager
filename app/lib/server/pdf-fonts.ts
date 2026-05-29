import { Font } from '@react-pdf/renderer';

export const CJK_FONT = 'NotoSansSC';
const FALLBACK_FONT = 'Helvetica';

const REG_URL = 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/fonts/NotoSansSC-Regular.ttf';
const BOLD_URL = 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/fonts/NotoSansSC-Bold.ttf';

const TTF_SIGNATURE = 0x00010000;

export async function registerPdfFonts(content: string): Promise<string> {
  if (!/[^\x00-\x7f]/.test(content)) return FALLBACK_FONT;

  try {
    const [regRes, boldRes] = await Promise.all([
      fetch(REG_URL, { signal: AbortSignal.timeout(30000) }),
      fetch(BOLD_URL, { signal: AbortSignal.timeout(30000) }),
    ]);

    if (!regRes.ok || !boldRes.ok) {
      console.error('[pdf-fonts] Font fetch failed: reg', regRes.status, 'bold', boldRes.status);
      return FALLBACK_FONT;
    }

    const [regBuf, boldBuf] = await Promise.all([
      regRes.arrayBuffer(),
      boldRes.arrayBuffer(),
    ]);

    for (const [label, buf] of [['reg', regBuf], ['bold', boldBuf]] as const) {
      if (buf.byteLength < 4 || new DataView(buf).getUint32(0) !== TTF_SIGNATURE) {
        console.error(`[pdf-fonts] Invalid TrueType signature for ${label}:`, Buffer.from(buf.slice(0, 4)).toString('hex'));
        return FALLBACK_FONT;
      }
    }

    const regSrc = `data:font/truetype;base64,${Buffer.from(regBuf).toString('base64')}`;
    const boldSrc = `data:font/truetype;base64,${Buffer.from(boldBuf).toString('base64')}`;

    Font.register({
      family: CJK_FONT,
      fonts: [
        { src: regSrc, fontWeight: 400 },
        { src: boldSrc, fontWeight: 700 },
      ],
    });

    return CJK_FONT;
  } catch (e) {
    console.error('[pdf-fonts] CJK font registration failed:', e instanceof Error ? e.message : e);
    return FALLBACK_FONT;
  }
}
