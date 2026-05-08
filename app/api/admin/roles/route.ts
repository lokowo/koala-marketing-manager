import type { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const status = req.nextUrl.searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 200);
    const page = Math.max(parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10), 1);

    let query = db
      .from('role_applications')
      .select('*, user_profiles(display_name, email, avatar_url, phone)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return Response.json({ data: data ?? [], total: count ?? 0, page, limit });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/roles GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSuperAdmin();
    const { applicationId, action, rejectReason } = await req.json();

    if (!applicationId || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data: app, error: fetchErr } = await db
      .from('role_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchErr || !app) {
      return Response.json({ error: 'Application not found' }, { status: 404 });
    }

    if (app.status !== 'pending') {
      return Response.json({ error: '该申请已处理' }, { status: 409 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      await db
        .from('role_applications')
        .update({ status: 'approved', reviewed_by: user.id, reviewed_at: now })
        .eq('id', applicationId);

      await db
        .from('user_roles')
        .upsert({ user_id: app.user_id, role: app.applied_role }, { onConflict: 'user_id' });

      await db
        .from('user_profiles')
        .update({ role: app.applied_role, role_status: 'approved', role_approved_by: user.id })
        .eq('id', app.user_id);

      await db.from('notifications').insert({
        user_id: app.user_id,
        type: 'role_approved',
        title: '角色申请已通过',
        content: `你的${app.applied_role === 'admin' ? '管理员' : '销售'}角色申请已通过。`,
      });
    } else {
      await db
        .from('role_applications')
        .update({ status: 'rejected', reviewed_by: user.id, reviewed_at: now, review_note: rejectReason || null })
        .eq('id', applicationId);

      await db.from('user_profiles').update({ role_status: 'rejected' }).eq('id', app.user_id);

      await db.from('notifications').insert({
        user_id: app.user_id,
        type: 'role_rejected',
        title: '角色申请未通过',
        body: rejectReason ? `原因：${rejectReason}` : '你的角色申请未通过，如有疑问请联系管理员。',
      });
    }

    return Response.json({ success: true, action });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/roles POST]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
