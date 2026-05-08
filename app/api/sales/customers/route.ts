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

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200);
    const page = Math.max(parseInt(sp.get('page') ?? '1', 10), 1);
    const stage = sp.get('stage');

    let query = db
      .from('sales_customers')
      .select('*, user_profiles(display_name, email, avatar_url)', { count: 'exact' })
      .eq('sales_user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (stage) query = query.eq('stage', stage);

    const { data, count, error } = await query;
    if (error) throw error;

    return Response.json({ data: data ?? [], total: count ?? 0, page, limit });
  } catch (e) {
    console.error('[sales/customers GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { customerId, stage, note } = await req.json();
    if (!customerId) return Response.json({ error: 'customerId required' }, { status: 400 });

    const { data, error } = await db
      .from('sales_customers')
      .update({ stage, note, updated_at: new Date().toISOString() })
      .eq('id', customerId)
      .eq('sales_user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({ data });
  } catch (e) {
    console.error('[sales/customers POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
