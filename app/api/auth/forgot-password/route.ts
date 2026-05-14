import { supabaseAdmin } from '../../../lib/supabase/server';
import { sendPasswordResetEmail } from '../../../lib/services/emailService';
import { authLimiter } from '../../../lib/ratelimit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  try {
    if (authLimiter) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const { success } = await authLimiter.limit(ip);
      if (!success) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });
    }

    const { email } = await req.json();
    if (!email) return Response.json({ error: 'email required' }, { status: 400 });

    // Check if user exists (don't reveal this to client for security)
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    // Always return success to prevent email enumeration
    if (!user) {
      return Response.json({ success: true, message: '如果该邮箱已注册，重置链接已发送' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await db
      .from('email_verifications')
      .upsert({
        email,
        code,
        type: 'password_reset',
        expires_at: expiresAt,
        verified: false,
        created_at: new Date().toISOString(),
      }, { onConflict: 'email,type' });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';
    const resetUrl = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&code=${code}`;

    await sendPasswordResetEmail({ to: email, code, resetUrl });

    return Response.json({ success: true, message: '如果该邮箱已注册，重置链接已发送' });
  } catch (error) {
    console.error('[forgot-password]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
