import type { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200);
    const page = Math.max(parseInt(sp.get('page') ?? '1', 10), 1);
    const userId = sp.get('userId');
    const action = sp.get('action');

    let query = db
      .from('admin_work_logs')
      .select('*, user_profiles!inner(display_name, email, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);

    const { data, count, error } = await query;
    if (error) throw error;

    return Response.json({ data: data ?? [], total: count ?? 0, page, limit });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/work-logs GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
