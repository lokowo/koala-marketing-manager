import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) {
      return Response.json({ error: 'email, code, and newPassword required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({ error: '密码至少8位' }, { status: 400 });
    }

    // Verify the reset code
    const { data: record, error: fetchErr } = await db
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('type', 'password_reset')
      .single();

    if (fetchErr || !record) {
      return Response.json({ error: '重置码不存在，请重新请求' }, { status: 400 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return Response.json({ error: '重置码已过期，请重新请求' }, { status: 400 });
    }

    if (record.code !== code) {
      return Response.json({ error: '重置码错误' }, { status: 400 });
    }

    // Find user and update password
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      return Response.json({ error: '用户不存在' }, { status: 404 });
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateErr) {
      console.error('[reset-password] update:', updateErr);
      return Response.json({ error: '密码重置失败' }, { status: 500 });
    }

    // Mark code as used
    await db
      .from('email_verifications')
      .update({ verified: true })
      .eq('email', email)
      .eq('type', 'password_reset');

    return Response.json({ success: true, message: '密码重置成功' });
  } catch (error) {
    console.error('[reset-password]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
