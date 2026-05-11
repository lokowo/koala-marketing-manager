import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { notifyRoleApplication } from '../../../lib/server/slack';
import { logWork } from '../../../lib/worklog';
import { notifySuperAdmins } from '../../../lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await db
      .from('role_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return Response.json({ application: data ?? null });
  } catch (e) {
    console.error('[role-application GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, reason, phone, full_name: frontName, email: frontEmail } = await req.json();

    if (!role || !['admin', 'sales'].includes(role)) {
      return Response.json({ error: '无效的角色类型' }, { status: 400 });
    }
    if (!reason || reason.length < 10) {
      return Response.json({ error: '请填写申请理由（至少10字）' }, { status: 400 });
    }

    const email = frontEmail || user.email || '';

    let fullName = frontName || '';
    if (!fullName) {
      const { data: profile } = await db
        .from('user_profiles')
        .select('full_name, display_name')
        .eq('id', user.id)
        .single();
      fullName = profile?.full_name || profile?.display_name || email.split('@')[0] || '';
    }

    // Ensure user_profiles row exists (FK requirement)
    await db
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: email,
        display_name: fullName || email.split('@')[0],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true });

    const { data: existing } = await db
      .from('role_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (existing) {
      return Response.json({ error: '你已有一个待审核的申请' }, { status: 409 });
    }

    if (phone) {
      await db
        .from('user_profiles')
        .update({ phone, role_applied_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    const { data: application, error } = await db
      .from('role_applications')
      .insert({
        user_id: user.id,
        applied_role: role,
        reason,
        full_name: fullName,
        email,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    await db.from('user_profiles').update({
      role_status: 'pending',
      role_applied_at: new Date().toISOString(),
    }).eq('id', user.id);

    const roleName = role === 'admin' ? '管理员' : '销售';
    await notifySuperAdmins('新角色申请', `用户 ${fullName || email} 申请${roleName}角色，请前往角色管理审核。`).catch(() => {});

    await logWork({
      userId: user.id,
      role: 'admin',
      action: '提交角色申请',
      actionCategory: 'role_management',
      targetType: 'role_application',
      targetId: application?.id,
      details: { appliedRole: role, reason },
    }).catch(() => {});

    notifyRoleApplication({
      userName: fullName || email,
      email,
      role: roleName,
    });

    return Response.json({ success: true, application }, { status: 201 });
  } catch (e) {
    console.error('[role-application POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
