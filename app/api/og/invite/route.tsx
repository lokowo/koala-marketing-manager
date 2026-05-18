import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '../../../lib/supabase/server';
import QRCode from 'qrcode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export const runtime = 'nodejs';

let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const res = await fetch(
    'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap',
  );
  const css = await res.text();
  const urls = css.match(/url\(([^)]+)\)/g);
  if (!urls || urls.length === 0) throw new Error('No font URL found');
  const fontUrl = urls[0].replace(/url\(|\)/g, '');
  const fontRes = await fetch(fontUrl);
  fontCache = await fontRes.arrayBuffer();
  return fontCache;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return Response.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const { data: codeRecord } = await db
    .from('referral_codes')
    .select('user_id')
    .eq('code', code)
    .single();

  if (!codeRecord) {
    return Response.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  const { data: profile } = await db
    .from('user_profiles')
    .select('display_name, full_name, avatar_url')
    .eq('id', codeRecord.user_id)
    .single();

  const displayName = profile?.display_name || profile?.full_name || 'Koala 用户';
  const avatarUrl = profile?.avatar_url || null;

  const referralUrl = `https://www.koalaphd.com/koala/auth?ref=${code}`;

  const [qrDataUrl, fontData] = await Promise.all([
    QRCode.toDataURL(referralUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#FFFFFF', light: '#00000000' },
      errorCorrectionLevel: 'M',
    }),
    loadFont(),
  ]);

  let avatarSrc: string | null = null;
  if (avatarUrl) {
    try {
      const avatarRes = await fetch(avatarUrl);
      if (avatarRes.ok) {
        const buf = await avatarRes.arrayBuffer();
        const ct = avatarRes.headers.get('content-type') || 'image/png';
        avatarSrc = `data:${ct};base64,${Buffer.from(buf).toString('base64')}`;
      }
    } catch {
      // fallback to initial letter
    }
  }

  const initial = (displayName[0] || 'K').toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: 750,
          height: 1334,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, #0D7C5F 0%, #085544 100%)',
          fontFamily: '"Noto Sans SC", sans-serif',
          padding: '60px 50px',
        }}
      >
        {/* Top branding */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 52, display: 'flex' }}>🐨</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: 4, display: 'flex' }}>
            KOALA STUDY ADVISORS
          </div>
        </div>

        {/* Middle: avatar + invite text */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              width={80}
              height={80}
              style={{ borderRadius: 40, border: '3px solid rgba(255,255,255,0.4)', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                background: 'rgba(255,255,255,0.2)',
                border: '3px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', display: 'flex' }}>
            {displayName} 同学邀请你加入
          </div>
        </div>

        {/* 3 selling points */}
        <div style={{ display: 'flex', gap: 30, justifyContent: 'center' }}>
          {[
            { emoji: '🎯', label: 'AI 匹配导师' },
            { emoji: '📚', label: '24,000+ 学者库' },
            { emoji: '✉️', label: '一站式申请' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '20px 28px',
                minWidth: 160,
              }}
            >
              <div style={{ fontSize: 36, display: 'flex' }}>{item.emoji}</div>
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', fontWeight: 700, display: 'flex' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* QR code + CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              padding: 16,
              display: 'flex',
            }}
          >
            <img src={qrDataUrl} width={200} height={200} />
          </div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.85)', fontWeight: 700, display: 'flex' }}>
            扫码注册 各得15积分
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            borderTop: '1px solid rgba(255,255,255,0.15)',
            paddingTop: 20,
            width: '100%',
          }}
        >
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
            koalaphd.com
          </div>
        </div>
      </div>
    ),
    {
      width: 750,
      height: 1334,
      fonts: [
        {
          name: 'Noto Sans SC',
          data: fontData,
          style: 'normal',
          weight: 400,
        },
      ],
    },
  );
}
