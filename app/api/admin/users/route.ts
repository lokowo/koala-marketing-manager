import { NextRequest } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { logWork } from '../../../lib/worklog';
import { notifyUser, notifySuperAdmins } from '../../../lib/notifications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();

    const [profilesRes, rolesRes] = await Promise.all([
      db.from('user_profiles').select('id, email, display_name, created_at, updated_at'),
      db.from('user_roles').select('user_id, role'),
    ]);

    const profiles = (profilesRes.data ?? []) as { id: string; email: string; display_name: string; created_at: string; updated_at: string }[];
    const roles = (rolesRes.data ?? []) as { user_id: string; role: string }[];
    const roleMap = new Map(roles.map(r => [r.user_id, r.role]));

    const users = profiles.map(u => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      created_at: u.created_at,
      last_sign_in_at: u.updated_at,
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

    // Ensure user_profiles row exists (FK requirement for user_roles)
    const { data: targetAuth } = await supabaseAdmin.auth.admin.getUserById(userId);
    const targetEmail = targetAuth?.user?.email || '';
    await db
      .from('user_profiles')
      .upsert({
        id: userId,
        email: targetEmail,
        display_name: targetEmail.split('@')[0] || 'User',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true });

    const { error } = await db
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

    if (error) throw error;

    const roleLabels: Record<string, string> = { super_admin: '超级管理员', admin: '管理员', sales: '销售', viewer: '只读' };
    await logWork({
      userId: caller.id,
      role: 'admin',
      action: 'user_role_change',
      actionCategory: 'user_management',
      targetType: 'user',
      targetId: userId,
      details: { newRole: role, oldRole: existing?.role },
    }).catch(() => {});

    await notifyUser(userId, '角色变更', `你的角色已被调整为「${roleLabels[role] || role}」。`).catch(() => {});
    await notifySuperAdmins('用户角色变更', `用户 ${userId} 的角色已被调整为「${roleLabels[role] || role}」。`).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[admin/users PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
