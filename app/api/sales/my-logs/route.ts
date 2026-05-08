import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10), 100);
    const page = Math.max(parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10), 1);

    const { data, count, error } = await db
      .from('admin_work_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;
    return Response.json({ data: data ?? [], total: count ?? 0, page, limit });
  } catch (e) {
    console.error('[sales/my-logs GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
