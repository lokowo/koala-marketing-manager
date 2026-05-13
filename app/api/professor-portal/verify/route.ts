import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try {
    const { action, email, code } = await req.json();

    if (action === 'send_code') {
      if (!email) return Response.json({ error: '请输入邮箱' }, { status: 400 });

      const { data: professor } = await db
        .from('professors')
        .select('id, name, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!professor) {
        return Response.json({ error: '该邮箱未在平台注册为教授。如有问题请联系 info@koalaphd.com' }, { status: 404 });
      }

      // In production, send a real verification code via Resend
      // For now, store a code in a simple way
      const verifyCode = String(Math.floor(100000 + Math.random() * 900000));

      // Store code temporarily (in production use a proper temp store)
      await db.from('professors').update({
        verification_code: verifyCode,
        verification_code_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }).eq('id', professor.id);

      // TODO: Send email via Resend
      console.log(`[professor-portal] Verification code for ${email}: ${verifyCode}`);

      return Response.json({ success: true, message: '验证码已发送' });
    }

    if (action === 'verify') {
      if (!email || !code) return Response.json({ error: '缺少参数' }, { status: 400 });

      const { data: professor } = await db
        .from('professors')
        .select('id, verification_code, verification_code_expires')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!professor || professor.verification_code !== code) {
        return Response.json({ error: '验证码错误' }, { status: 400 });
      }

      if (new Date(professor.verification_code_expires) < new Date()) {
        return Response.json({ error: '验证码已过期' }, { status: 400 });
      }

      // Get current user from auth header or cookie
      // For now, just clear the code
      await db.from('professors').update({
        verification_code: null,
        verification_code_expires: null,
        claimed_at: new Date().toISOString(),
      }).eq('id', professor.id);

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[professor-portal/verify]', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
