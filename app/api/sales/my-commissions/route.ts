import { getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: agent } = await db
      .from('sales_agents')
      .select('id')
      .eq('user_id', result.user.id)
      .eq('status', 'active')
      .single();

    if (!agent) return Response.json({ error: 'Not a sales agent' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    let baseQuery = db
      .from('sales_commissions')
      .select('*, sales_referrals!inner(referred_user_id, user_profiles:referred_user_id(display_name, email))')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (from) baseQuery = baseQuery.gte('created_at', from);
    if (to) baseQuery = baseQuery.lte('created_at', to + 'T23:59:59');

    const { data: allData, error: allError } = await baseQuery;
    if (allError) throw allError;

    const allItems = (allData || []).map((c: any) => ({
      id: c.id,
      product_type: c.product_type,
      product_name: c.product_name,
      payment_amount: c.payment_amount,
      commission_rate: c.commission_rate,
      commission_amount: c.commission_amount,
      status: c.status,
      created_at: c.created_at,
      paid_at: c.paid_at,
      user_name: c.sales_referrals?.user_profiles?.display_name || c.sales_referrals?.user_profiles?.email || '未知',
    }));

    const pendingItems = allItems.filter((c: any) => c.status === 'pending');
    const confirmedItems = allItems.filter((c: any) => c.status === 'confirmed');
    const paidItems = allItems.filter((c: any) => c.status === 'paid_out');

    const summary = {
      pending_total: pendingItems.reduce((s: number, c: any) => s + c.commission_amount, 0),
      pending_count: pendingItems.length,
      confirmed_total: confirmedItems.reduce((s: number, c: any) => s + c.commission_amount, 0),
      confirmed_count: confirmedItems.length,
      paid_total: paidItems.reduce((s: number, c: any) => s + c.commission_amount, 0),
      paid_count: paidItems.length,
    };

    const items = (status && status !== 'all') ? allItems.filter((c: any) => c.status === status) : allItems;
    const total = items.length;
    const offset = (page - 1) * limit;
    const paged = items.slice(offset, offset + limit);

    return Response.json({ data: paged, summary, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[sales/my-commissions]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
