import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = db
      .from('sales_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) query = query.eq('action', action);
    if (role) query = query.eq('actor_role', role);

    const { data, error, count } = await query;
    if (error) throw error;

    return Response.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[admin/sales-audit GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
