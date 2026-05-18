import sharp from 'sharp';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSvg(displayName: string, code: string): string {
  const name = escapeXml(displayName);
  const codeText = escapeXml(code);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1334" viewBox="0 0 750 1334">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0D7C5F"/>
      <stop offset="100%" stop-color="#085544"/>
    </linearGradient>
  </defs>
  <rect width="750" height="1334" fill="url(#bg)"/>

  <!-- Top branding -->
  <circle cx="375" cy="100" r="36" fill="rgba(255,255,255,0.15)"/>
  <text x="375" y="108" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="700" fill="white">K</text>
  <text x="375" y="175" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="white" letter-spacing="4">KOALA STUDY ADVISORS</text>
  <text x="375" y="210" text-anchor="middle" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">AI PhD Application Platform</text>

  <!-- Avatar circle with initial -->
  <circle cx="375" cy="310" r="45" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>
  <text x="375" y="325" text-anchor="middle" font-family="sans-serif" font-size="32" font-weight="700" fill="white">${escapeXml((displayName[0] || 'K').toUpperCase())}</text>

  <!-- Invite text -->
  <text x="375" y="410" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="white">${name}</text>
  <text x="375" y="450" text-anchor="middle" font-family="sans-serif" font-size="20" fill="rgba(255,255,255,0.8)">invites you to join Koala PhD</text>

  <!-- 3 selling points -->
  <rect x="50" y="500" width="200" height="90" rx="16" fill="rgba(255,255,255,0.1)"/>
  <text x="150" y="540" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="white">AI</text>
  <text x="150" y="570" text-anchor="middle" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.8)">Smart Matching</text>

  <rect x="275" y="500" width="200" height="90" rx="16" fill="rgba(255,255,255,0.1)"/>
  <text x="375" y="540" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="white">24K+</text>
  <text x="375" y="570" text-anchor="middle" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.8)">Scholars</text>

  <rect x="500" y="500" width="200" height="90" rx="16" fill="rgba(255,255,255,0.1)"/>
  <text x="600" y="540" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="white">1-Stop</text>
  <text x="600" y="570" text-anchor="middle" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.8)">Application</text>

  <!-- QR area background -->
  <rect x="243" y="660" width="264" height="264" rx="20" fill="rgba(255,255,255,0.15)"/>

  <!-- CTA text -->
  <text x="375" y="980" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="rgba(255,255,255,0.85)">Scan to Register</text>
  <text x="375" y="1010" text-anchor="middle" font-family="sans-serif" font-size="16" fill="rgba(255,255,255,0.6)">Both get 15 credits</text>

  <!-- Referral code -->
  <rect x="275" y="1050" width="200" height="40" rx="10" fill="rgba(255,255,255,0.1)"/>
  <text x="375" y="1077" text-anchor="middle" font-family="monospace" font-size="18" font-weight="700" fill="white" letter-spacing="3">${codeText}</text>
  <text x="375" y="1115" text-anchor="middle" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.4)">Invite Code</text>

  <!-- Footer divider -->
  <line x1="100" y1="1260" x2="650" y2="1260" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="375" y="1300" text-anchor="middle" font-family="sans-serif" font-size="16" fill="rgba(255,255,255,0.5)">koalaphd.com</text>
</svg>`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return Response.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    let displayName = 'Koala User';

    const { data: codeRecord } = await db
      .from('referral_codes')
      .select('user_id')
      .eq('code', code)
      .single();

    if (codeRecord) {
      const { data: profile } = await db
        .from('user_profiles')
        .select('display_name, full_name')
        .eq('id', codeRecord.user_id)
        .single();
      displayName = profile?.display_name || profile?.full_name || 'Koala User';
    }

    const referralUrl = `https://www.koalaphd.com/koala/auth?ref=${code}`;

    const [svgBg, qrBuffer] = await Promise.all([
      sharp(Buffer.from(buildSvg(displayName, code))).png().toBuffer(),
      QRCode.toBuffer(referralUrl, {
        width: 232,
        margin: 1,
        color: { dark: '#FFFFFF', light: '#00000000' },
        errorCorrectionLevel: 'M',
        type: 'png',
      }),
    ]);

    const poster = await sharp(svgBg)
      .composite([
        { input: qrBuffer, left: 259, top: 656 },
      ])
      .png({ quality: 90 })
      .toBuffer();

    return new Response(new Uint8Array(poster), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err) {
    console.error('[invite-poster]', err);
    return Response.json({ error: 'Failed to generate poster' }, { status: 500 });
  }
}
