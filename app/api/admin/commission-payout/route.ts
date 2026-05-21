import { requireAdmin, getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'confirmed';
    const agentId = searchParams.get('agent_id');

    let query = db
      .from('sales_commissions')
      .select('*, sales_agents(user_id, referral_code, user_profiles:user_id(display_name, email)), sales_referrals(referred_user_id, user_profiles:referred_user_id(display_name, email))')
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);
    if (agentId) query = query.eq('agent_id', agentId);

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map((c: any) => ({
      id: c.id,
      agent_name: c.sales_agents?.user_profiles?.display_name || c.sales_agents?.user_profiles?.email || c.sales_agents?.referral_code,
      user_name: c.sales_referrals?.user_profiles?.display_name || c.sales_referrals?.user_profiles?.email || '未知',
      product_type: c.product_type,
      product_name: c.product_name,
      payment_amount: c.payment_amount,
      commission_rate: c.commission_rate,
      commission_amount: c.commission_amount,
      status: c.status,
      created_at: c.created_at,
      paid_at: c.paid_at,
    }));

    const pendingTotal = items.filter((c: any) => c.status === 'confirmed').reduce((s: number, c: any) => s + c.commission_amount, 0);

    return Response.json({ data: items, pendingTotal: Math.round(pendingTotal * 100) / 100 });
  } catch (error) {
    console.error('[admin/commission-payout GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result || !['admin', 'super_admin'].includes(result.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commission_ids } = await req.json();
    if (!commission_ids?.length) {
      return Response.json({ error: 'No commission IDs provided' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { error } = await db
      .from('sales_commissions')
      .update({ status: 'paid_out', paid_at: now })
      .in('id', commission_ids)
      .eq('status', 'confirmed');

    if (error) throw error;

    await db.from('sales_audit_logs').insert({
      actor_id: result.user.id,
      actor_email: result.user.email || '',
      actor_role: result.role,
      action: 'commission_batch_payout',
      target_type: 'commission',
      details: { commission_ids, count: commission_ids.length, paid_at: now },
    });

    return Response.json({ ok: true, count: commission_ids.length });
  } catch (error) {
    console.error('[admin/commission-payout POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
