import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

let fontCache: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const buf = await readFile(join(process.cwd(), 'assets/NotoSansSC-Bold.subset.ttf'));
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return fontCache;
}

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return Response.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  try {
    const [fontData, userInfo, qrDataUrl] = await Promise.all([
      loadFont(),
      getUserInfo(code),
      QRCode.toDataURL(`https://www.koalaphd.com/koala/register?ref=${code}`, {
        width: 180, margin: 1,
        color: { dark: '#1a1a2e', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }),
    ]);

    const { displayName, initial, days } = userInfo;

    return new ImageResponse(
      (
        <div style={{ width: 750, height: 1334, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(180deg, #0D7C5F 0%, #063D32 100%)', fontFamily: 'NotoSansSC' }}>

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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,215,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#FFD700' }}>Q</div>
              <div style={{ fontSize: 16, color: 'white', marginLeft: 14 }}>AI智能匹配 24,494位澳洲学者库</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,215,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#FFD700' }}>E</div>
              <div style={{ fontSize: 16, color: 'white', marginLeft: 14 }}>一键生成个性化套磁信 30秒搞定</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,215,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#FFD700' }}>D</div>
              <div style={{ fontSize: 16, color: 'white', marginLeft: 14 }}>CV SOP 文书审阅 模拟面试</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,215,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#FFD700' }}>B</div>
              <div style={{ fontSize: 16, color: 'white', marginLeft: 14 }}>学术知识库 快速查找技术资料与索引</div>
            </div>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginTop: 10 }}>扫码注册</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 5, background: 'rgba(255,255,255,0.1)', padding: '4px 14px', borderRadius: 8, letterSpacing: 2 }}>{code}</div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', width: 750, justifyContent: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>www.koalaphd.com</div>
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
