import { supabaseAdmin } from '../../../lib/supabase/server';
import { sendVerificationEmail } from '../../../lib/services/emailService';
import { authLimiter, safeLimit } from '../../../lib/ratelimit';

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = await safeLimit(authLimiter, ip);
    if (!allowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

    const { email } = await req.json();
    if (!email) return Response.json({ error: 'email required' }, { status: 400 });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabaseAdmin as any)
      .from('email_verifications')
      .upsert({
        email,
        code,
        type: 'email_verify',
        expires_at: expiresAt,
        verified: false,
        created_at: new Date().toISOString(),
      }, { onConflict: 'email,type' });

    if (dbError) {
      console.error('[send-verification] db:', dbError);
      return Response.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';
    const verifyUrl = `${baseUrl}/koala/auth?mode=verify&email=${encodeURIComponent(email)}&code=${code}`;

    const { error: emailError } = await sendVerificationEmail({
      to: email,
      code,
      verifyUrl,
    });

    if (emailError) {
      console.error('[send-verification] email:', emailError);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, message: '验证码已发送' });
  } catch (error) {
    console.error('[send-verification]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
