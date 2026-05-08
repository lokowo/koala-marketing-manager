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

    const customerId = req.nextUrl.searchParams.get('customerId');
    if (!customerId) return Response.json({ error: 'Missing customerId' }, { status: 400 });

    const { data, error } = await db
      .from('admin_work_logs')
      .select('id, action, details, created_at')
      .eq('action', 'customer_update')
      .eq('target_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return Response.json({ timeline: data ?? [] });
  } catch (e) {
    console.error('[sales/customer-timeline GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
