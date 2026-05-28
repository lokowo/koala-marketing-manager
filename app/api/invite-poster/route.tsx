import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/* ── Theme definitions ────────────────────────────────── */

interface GradientTheme {
  bg: string;
  overlay?: undefined;
}
interface ImageTheme {
  bg: string;
  overlay: true;
}
type ThemeDef = GradientTheme | ImageTheme;

const THEMES: Record<string, ThemeDef> = {
  dark:    { bg: 'linear-gradient(135deg, #0F1419 0%, #1A1A2E 50%, #0d2818 100%)' },
  navy:    { bg: 'linear-gradient(135deg, #0a1628 0%, #162040 50%, #0a2030 100%)' },
  warm:    { bg: 'linear-gradient(135deg, #1a1408 0%, #2a1e10 50%, #1a1408 100%)' },
  'bg-11': { bg: '/images/posters/11.png', overlay: true },
  'bg-22': { bg: '/images/posters/22.png', overlay: true },
  'bg-33': { bg: '/images/posters/33.png', overlay: true },
  'bg-44': { bg: '/images/posters/44.png', overlay: true },
  'bg-55': { bg: '/images/posters/55.png', overlay: true },
  'bg-66': { bg: '/images/posters/66.png', overlay: true },
};

/* ── Font cache ───────────────────────────────────────── */

let fontCache: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const buf = await readFile(join(process.cwd(), 'assets/NotoSansSC-Bold.subset.ttf'));
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return fontCache;
}

/* ── User lookup ──────────────────────────────────────── */

async function getUserInfo(code: string) {
  try {
    const { data: codeRecord } = await db
      .from('referral_codes')
      .select('user_id')
      .eq('code', code)
      .single();

    if (!codeRecord) return { displayName: 'Koala 用户', initial: 'K', days: 1 };

    const { data: profile } = await db
      .from('user_profiles')
      .select('display_name, full_name, created_at')
      .eq('id', codeRecord.user_id)
      .single();

    const name = profile?.display_name || profile?.full_name || 'Koala 用户';
    const initial = (name[0] || 'K').toUpperCase();
    const days = profile?.created_at
      ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000))
      : 1;

    return { displayName: name, initial, days };
  } catch {
    return { displayName: 'Koala 用户', initial: 'K', days: 1 };
  }
}

/* ── Load image as base64 data URL for next/og ────────── */

async function loadImageAsDataUrl(relativePath: string): Promise<string> {
  const abs = join(process.cwd(), 'public', relativePath);
  const buf = await readFile(abs);
  const base64 = buf.toString('base64');
  return `data:image/png;base64,${base64}`;
}

/* ── GET handler ──────────────────────────────────────── */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const themeId = searchParams.get('theme') || 'dark';

  if (!code) {
    return Response.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const theme = THEMES[themeId] ?? THEMES.dark;

  try {
    const [fontData, userInfo, qrDataUrl] = await Promise.all([
      loadFont(),
      getUserInfo(code),
      QRCode.toDataURL(`https://koalaphd.com/koala/auth?ref=${code}`, {
        width: 180, margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }),
    ]);

    const { displayName, initial, days } = userInfo;

    // For image themes, load the background as a data URL
    let bgDataUrl: string | null = null;
    if (theme.overlay) {
      bgDataUrl = await loadImageAsDataUrl(theme.bg);
    }

    // Feature items
    const features = [
      { icon: '🎯', text: '覆盖全澳 38 所大学导师与学者' },
      { icon: '✉️', text: '一键生成个性化套磁信 30秒搞定' },
      { icon: '📝', text: 'CV SOP 文书审阅 模拟面试' },
      { icon: '📚', text: '学术知识库 快速查找技术资料与索引' },
    ];

    return new ImageResponse(
      (
        <div style={{ width: 750, height: 1334, display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: 'NotoSansSC' }}>

          {/* Background layer */}
          {theme.overlay && bgDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bgDataUrl} width={750} height={1334} style={{ position: 'absolute', top: 0, left: 0, width: 750, height: 1334, objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: 750, height: 1334, background: 'rgba(15,20,25,0.50)' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: 750, height: 1334, background: 'linear-gradient(to bottom, rgba(15,20,25,0.55) 0%, rgba(15,20,25,0.10) 40%, rgba(15,20,25,0.10) 60%, rgba(15,20,25,0.55) 100%)' }} />
            </>
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, width: 750, height: 1334, background: theme.bg }} />
          )}

          {/* Content */}
          <div style={{ position: 'relative', width: 750, height: 1334, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Top Branding */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 55 }}>
              <div style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white', fontWeight: 700 }}>K</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'white', marginTop: 12, letterSpacing: 2 }}>Koala PhD</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>www.koalaphd.com</div>
            </div>

            {/* User Invite Card */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 50px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: 'linear-gradient(135deg, #FFD700, #FFA500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'white' }}>{initial}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'white', marginTop: 14 }}>{`${displayName}同学邀请你加入`}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>{`已使用 ${days} 天`}</div>
            </div>

            {/* Headline */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 28, fontSize: 30, fontWeight: 700 }}>
              <span style={{ color: 'white' }}>邀请好友 各得</span>
              <span style={{ color: '#FFD700', marginLeft: 4 }}>15积分</span>
            </div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>你的PhD申请AI智能顾问平台</div>

            {/* Feature Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28, gap: 14, width: 580 }}>
              {features.map((f) => (
                <div key={f.icon} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,215,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#FFD700' }}>{f.icon}</div>
                  <div style={{ fontSize: 16, color: 'white', marginLeft: 14 }}>{f.text}</div>
                </div>
              ))}
            </div>

            {/* Ola speech bubble */}
            <div style={{ display: 'flex', width: 580, marginTop: 24 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 18px', fontSize: 14, color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                我叫Ola，是你澳洲研究型课程的小助理~
              </div>
            </div>

            {/* QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24 }}>
              <div style={{ background: 'white', borderRadius: 16, padding: 12, display: 'flex' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} width={170} height={170} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginTop: 16 }}>扫码注册</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>📷 请使用手机相机扫码（微信扫码可能无法登录）</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 16, background: 'rgba(255,255,255,0.1)', padding: '4px 14px', borderRadius: 8, letterSpacing: 2 }}>{code}</div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', width: 750, justifyContent: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>www.koalaphd.com</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 750,
        height: 1334,
        fonts: [{ name: 'NotoSansSC', data: fontData, weight: 700, style: 'normal' as const }],
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      },
    );
  } catch (err) {
    console.error('[invite-poster]', err);
    return Response.json({ error: 'Failed to generate poster' }, { status: 500 });
  }
}
