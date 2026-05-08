import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

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

    const { role, reason, phone } = await req.json();

    if (!role || !['admin', 'sales'].includes(role)) {
      return Response.json({ error: '无效的角色类型' }, { status: 400 });
    }
    if (!reason || reason.length < 10) {
      return Response.json({ error: '请填写申请理由（至少10字）' }, { status: 400 });
    }

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
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    await db.from('user_profiles').update({
      role_status: 'pending',
      role_applied_at: new Date().toISOString(),
    }).eq('id', user.id);

    return Response.json({ application }, { status: 201 });
  } catch (e) {
    console.error('[role-application POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
