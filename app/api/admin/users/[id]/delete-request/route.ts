import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase/server';
import { logWork } from '../../../../../lib/worklog';
import { notifySuperAdmins, notifyUserAction } from '../../../../../lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: caller, role } = await requireAdmin();
    const { id: targetId } = await params;

    if (targetId === caller.id) {
      return Response.json({ error: '不能删除自己' }, { status: 400 });
    }

    const { data: targetAuth } = await supabaseAdmin.auth.admin.getUserById(targetId);
    if (!targetAuth?.user) {
      return Response.json({ error: '用户不存在' }, { status: 404 });
    }
    const targetEmail = targetAuth.user.email || targetId;

    const { data: callerProfile } = await db
      .from('user_profiles')
      .select('display_name')
      .eq('id', caller.id)
      .single();
    const callerName = callerProfile?.display_name || caller.email || 'Admin';

    if (role === 'super_admin') {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
      if (delErr) throw delErr;

      await logWork({
        userId: caller.id,
        role: 'admin',
        action: '删除用户',
        actionCategory: 'user_management',
        targetType: 'user',
        targetId,
        targetName: targetEmail,
      }).catch(() => {});

      await notifyUserAction({
        actionBy: caller.id,
        actionByName: callerName,
        action: '删除了用户',
        targetUserId: targetId,
        targetUserEmail: targetEmail,
      }).catch(() => {});

      return Response.json({ status: 'deleted' });
    }

    await notifySuperAdmins(
      '删除用户请求',
      `${callerName} 提出删除用户 ${targetEmail}，请确认。`,
      'admin',
      `/dashboard/koala/users/${targetId}`
    );

    await logWork({
      userId: caller.id,
      role: 'admin',
      action: '申请删除用户',
      actionCategory: 'user_management',
      targetType: 'user',
      targetId,
      targetName: targetEmail,
    }).catch(() => {});

    return Response.json({ status: 'pending' });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[delete-request POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
