import { getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const [
      visitsThis, visitsLast,
      refsThis, refsLast,
      commsThis, commsLast,
      targets,
    ] = await Promise.all([
      db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('visited_at', monthStart),
      db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('visited_at', lastMonthStart).lte('visited_at', lastMonthEnd),
      db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', monthStart),
      db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
      db.from('sales_commissions').select('commission_amount, status').eq('agent_id', agent.id).gte('created_at', monthStart).neq('status', 'rejected'),
      db.from('sales_commissions').select('commission_amount, status').eq('agent_id', agent.id).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd).neq('status', 'rejected'),
      db.from('sales_kpi_targets').select('*').eq('agent_id', agent.id).lte('period_start', now.toISOString().split('T')[0]).gte('period_end', now.toISOString().split('T')[0]).maybeSingle(),
    ]);

    const commsThisData = commsThis.data || [];
    const commsLastData = commsLast.data || [];
    const commissionThis = commsThisData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
    const commissionLast = commsLastData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);

    const target = targets.data;

    return Response.json({
      visits: {
        current: visitsThis.count || 0,
        lastMonth: visitsLast.count || 0,
        target: target?.target_visits || 0,
      },
      registrations: {
        current: refsThis.count || 0,
        lastMonth: refsLast.count || 0,
        target: target?.target_registrations || 0,
      },
      conversions: {
        current: commsThisData.length,
        lastMonth: commsLastData.length,
        target: target?.target_conversions || 0,
      },
      commission: {
        current: Math.round(commissionThis * 100) / 100,
        lastMonth: Math.round(commissionLast * 100) / 100,
        target: target?.target_revenue || 0,
      },
    });
  } catch (error) {
    console.error('[sales/dashboard-stats]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
