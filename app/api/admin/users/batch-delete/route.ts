import { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { logWork } from '../../../../lib/worklog';
import { notifyAdmins } from '../../../../lib/notifications';

export async function POST(req: NextRequest) {
  try {
    const { user: caller } = await requireSuperAdmin();
    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ error: 'Missing userIds' }, { status: 400 });
    }

    if (userIds.includes(caller.id)) {
      return Response.json({ error: '不能删除自己' }, { status: 400 });
    }

    let deleted = 0;
    let failed = 0;

    for (const uid of userIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (error) {
        failed++;
        continue;
      }
      deleted++;
      await logWork({
        userId: caller.id,
        role: 'admin',
        action: '批量删除用户',
        actionCategory: 'user_management',
        targetType: 'user',
        targetId: uid,
        targetName: u?.user?.email || uid,
      }).catch(() => {});
    }

    await notifyAdmins(
      '批量删除用户',
      `已批量删除 ${deleted} 个用户${failed > 0 ? `，${failed} 个失败` : ''}。`,
    ).catch(() => {});

    return Response.json({ deleted, failed });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[batch-delete POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
