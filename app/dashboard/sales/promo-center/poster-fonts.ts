export interface PosterFont {
  family: string;
  label: string;
  category: 'zh' | 'en';
}

export const POSTER_FONTS: PosterFont[] = [
  { family: 'Noto Sans SC',          label: '思源黑体',     category: 'zh' },
  { family: 'Noto Serif SC',         label: '思源宋体',     category: 'zh' },
  { family: 'ZCOOL KuaiLe',          label: '站酷快乐体',   category: 'zh' },
  { family: 'Alibaba PuHuiTi 2.0',   label: '阿里巴巴普惠体', category: 'zh' },
  { family: 'LXGW WenKai',           label: '霞鹜文楷',     category: 'zh' },
  { family: 'Inter',                  label: 'Inter',       category: 'en' },
  { family: 'Montserrat',             label: 'Montserrat',  category: 'en' },
  { family: 'Playfair Display',       label: 'Playfair',    category: 'en' },
  { family: 'Poppins',                label: 'Poppins',     category: 'en' },
  { family: 'Roboto',                 label: 'Roboto',      category: 'en' },
];

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Alibaba+PuHuiTi+2.0:wght@400;700' +
  '&family=Inter:wght@400;700' +
  '&family=LXGW+WenKai:wght@400;700' +
  '&family=Montserrat:wght@400;700' +
  '&family=Noto+Sans+SC:wght@400;700' +
  '&family=Noto+Serif+SC:wght@400;700' +
  '&family=Playfair+Display:wght@400;700' +
  '&family=Poppins:wght@400;700' +
  '&family=Roboto:wght@400;700' +
  '&family=ZCOOL+KuaiLe' +
  '&display=swap';

const LINK_ID = 'poster-google-fonts';

export async function loadPosterFonts(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (!document.getElementById(LINK_ID)) {
    const link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }
  await document.fonts.ready;
  const loads = POSTER_FONTS.flatMap(f => [
    document.fonts.load(`400 20px "${f.family}"`).catch(() => {}),
    document.fonts.load(`700 20px "${f.family}"`).catch(() => {}),
  ]);
  await Promise.all(loads);
}

export const DEFAULT_ZH_FONT = 'Noto Sans SC';
export const DEFAULT_EN_FONT = 'Inter';
