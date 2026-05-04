import { supabaseAdmin } from '../../../lib/supabase/server';
import { sendWelcomeEmail } from '../../../lib/services/emailService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return Response.json({ error: 'email and code required' }, { status: 400 });
    }

    const { data: record, error: fetchErr } = await db
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('type', 'email_verify')
      .single();

    if (fetchErr || !record) {
      return Response.json({ error: '验证码不存在，请重新发送' }, { status: 400 });
    }

    if (record.verified) {
      return Response.json({ success: true, message: '邮箱已验证' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return Response.json({ error: '验证码已过期，请重新发送' }, { status: 400 });
    }

    if (record.code !== code) {
      return Response.json({ error: '验证码错误' }, { status: 400 });
    }

    // Mark as verified
    await db
      .from('email_verifications')
      .update({ verified: true })
      .eq('email', email)
      .eq('type', 'email_verify');

    // Update user profile email_verified flag if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    if (user) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      // Update user_profiles
      await db
        .from('user_profiles')
        .update({ email_verified: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    // Send welcome email (async, don't block response)
    sendWelcomeEmail({ to: email, name: user?.user_metadata?.display_name }).catch(err => {
      console.error('[verify-email] welcome email:', err);
    });

    return Response.json({ success: true, message: '邮箱验证成功' });
  } catch (error) {
    console.error('[verify-email]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
