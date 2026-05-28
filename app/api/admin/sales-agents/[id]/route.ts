import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const { data: agent, error } = await db
      .from('sales_agents')
      .select('*, user_profiles:user_id(display_name, email, avatar_url)')
      .eq('id', id)
      .single();

    if (error || !agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const [referrals, commissions] = await Promise.all([
      db.from('sales_referrals').select('id', { count: 'exact' }).eq('agent_id', id).eq('is_test', false),
      db.from('sales_commissions').select('commission_amount, status').eq('agent_id', id),
    ]);

    const totalReferrals = referrals.count || 0;
    const commissionData = commissions.data || [];
    const totalRevenue = commissionData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
    const totalCommission = commissionData
      .filter((c: any) => ['pending', 'confirmed', 'paid_out'].includes(c.status))
      .reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);

    return Response.json({
      data: agent,
      stats: { totalReferrals, totalRevenue, totalCommission },
    });
  } catch (error) {
    console.error('[admin/sales-agents/[id] GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.status && ['active', 'inactive', 'suspended'].includes(body.status)) {
      updates.status = body.status;
    }
    if (body.tier) {
      updates.tier = body.tier;
    }
    if (typeof body.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await db
      .from('sales_agents')
      .update(updates)
      .eq('id', id)
      .select('*, user_profiles:user_id(display_name, email, avatar_url)')
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('[admin/sales-agents/[id] PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
