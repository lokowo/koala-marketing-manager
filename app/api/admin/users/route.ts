import { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { logWork } from '../../../lib/worklog';
import { notifyUser } from '../../../lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireSuperAdmin();

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: rolesRaw } = await db.from('user_roles').select('user_id, role');
    const roles = (rolesRaw ?? []) as { user_id: string; role: string }[];
    const roleMap = new Map(roles.map((r: { user_id: string; role: string }) => [r.user_id, r.role]));

    const users = authUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: roleMap.get(u.id) ?? null,
    }));

    return Response.json({ users });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/users GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user: caller } = await requireSuperAdmin();
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return Response.json({ error: 'Missing userId or role' }, { status: 400 });
    }
    if (!['super_admin', 'admin', 'sales', 'viewer'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (userId === caller.id) {
      return Response.json({ error: 'Cannot modify your own role' }, { status: 400 });
    }

    const { data: existingRaw } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const existing = existingRaw as { role: string } | null;
    if (existing?.role === 'super_admin') {
      return Response.json({ error: 'Cannot modify another super_admin' }, { status: 403 });
    }

    const { error } = await db
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

    if (error) throw error;

    const roleLabels: Record<string, string> = { super_admin: '超级管理员', admin: '管理员', sales: '销售', viewer: '只读' };
    await logWork({
      userId: caller.id,
      role: 'admin',
      action: '变更用户角色',
      actionCategory: 'user_management',
      targetType: 'user',
      targetId: userId,
      details: { newRole: role, oldRole: existing?.role },
    }).catch(() => {});

    await notifyUser(userId, '角色变更', `你的角色已变更为「${roleLabels[role] || role}」。`).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/users PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
