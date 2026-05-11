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
    if (!role) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200);
    const page = Math.max(parseInt(sp.get('page') ?? '1', 10), 1);
    const userId = sp.get('userId');
    const action = sp.get('action');
    const search = sp.get('search');
    const dateFrom = sp.get('dateFrom');
    const dateTo = sp.get('dateTo');
    const filterRole = sp.get('role');
    const category = sp.get('category');

    let query = db
      .from('admin_work_logs')
      .select('*, user_profiles!admin_work_logs_admin_profiles_fkey(display_name, email, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Role-based visibility:
    // super_admin: sees everything
    // admin: sees admin + system events (not sales-only)
    // sales: sees only their own logs
    if (role === 'sales') {
      query = query.eq('admin_id', user.id);
    } else if (role === 'admin') {
      // Admin sees admin & system events, not other sales users' events
      query = query.or(`details->role.eq."admin",details->role.eq."system",admin_id.eq.${user.id}`);
    }
    // super_admin sees all — no filter

    if (userId) query = query.eq('admin_id', userId);
    if (action) query = query.eq('action', action);
    if (category) query = query.eq('action_category', category);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());

    if (filterRole === 'admin') {
      query = query.not('details->role', 'eq', '"sales"');
    } else if (filterRole === 'sales') {
      query = query.eq('details->role', '"sales"');
    } else if (filterRole === 'system') {
      query = query.eq('details->role', '"system"');
    }

    if (search) {
      query = query.or(
        `action.ilike.%${search}%,target_type.ilike.%${search}%,target_name.ilike.%${search}%,target_id.ilike.%${search}%,details->>name.ilike.%${search}%,details->>topic.ilike.%${search}%,details->>profName.ilike.%${search}%,details->>stage.ilike.%${search}%,details->>note.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const admins: Record<string, string> = {};
    for (const log of data ?? []) {
      if (log.user_profiles?.display_name || log.user_profiles?.email) {
        admins[log.admin_id] = log.user_profiles.display_name || log.user_profiles.email;
      }
    }

    return Response.json({ data: data ?? [], total: count ?? 0, page, limit, admins });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/work-logs GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
