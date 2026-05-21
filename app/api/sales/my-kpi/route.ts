import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: agent } = await db
      .from('sales_agents')
      .select('id, user_id, referral_code, tier, user_profiles:user_id(display_name, email)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!agent) return Response.json({ error: 'Not a sales agent' }, { status: 403 });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [targetsRes, visitsRes, refsRes, commsRes, offlineRes] = await Promise.all([
      db.from('sales_kpi_targets').select('*')
        .eq('agent_id', agent.id)
        .lte('effective_from', today)
        .gte('effective_until', today)
        .order('effective_from', { ascending: false })
        .limit(1),
      db.from('sales_visits').select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .gte('visited_at', monthStart),
      db.from('sales_referrals').select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .gte('created_at', monthStart),
      db.from('sales_commissions').select('commission_amount')
        .eq('agent_id', agent.id)
        .gte('created_at', monthStart)
        .neq('status', 'rejected'),
      db.from('sales_referrals').select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .eq('offline_converted', true)
        .gte('offline_converted_at', monthStart),
    ]);

    const target = targetsRes.data?.[0] || null;
    const k1Current = visitsRes.count || 0;
    const k2Current = refsRes.count || 0;
    const k3Current = (commsRes.data || []).length;
    const k4Current = offlineRes.count || 0;
    const revenue = (commsRes.data || []).reduce(
      (s: number, c: { commission_amount: number }) => s + Number(c.commission_amount), 0
    );

    const k1Target = target?.kpi_1_visits || 0;
    const k2Target = target?.kpi_2_registrations || 0;
    const k3Target = target?.kpi_3_payments || 0;
    const k4Target = target?.kpi_4_offline || 0;
    const revenueTarget = target?.kpi_3_revenue || 0;

    const pct = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;
    const k1p = pct(k1Current, k1Target);
    const k2p = pct(k2Current, k2Target);
    const k3p = pct(k3Current, k3Target);
    const k4p = pct(k4Current, k4Target);
    const overallPct = Math.round(k1p * 0.15 + k2p * 0.25 + k3p * 0.35 + k4p * 0.25);

    const periodLabel = target
      ? `${target.effective_from} ~ ${target.effective_until}`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return Response.json({
      agent: {
        id: agent.id,
        display_name: agent.user_profiles?.display_name || agent.user_profiles?.email?.split('@')[0] || '未知',
        tier: agent.tier || 'standard',
        referral_code: agent.referral_code,
      },
      period: periodLabel,
      has_targets: !!target,
      kpis: {
        visits:        { current: k1Current, target: k1Target, pct: k1p },
        registrations: { current: k2Current, target: k2Target, pct: k2p },
        payments:      { current: k3Current, target: k3Target, pct: k3p },
        offline:       { current: k4Current, target: k4Target, pct: k4p },
        revenue:       { current: Math.round(revenue * 100) / 100, target: revenueTarget },
      },
      overall_pct: overallPct,
    });
  } catch (e) {
    console.error('[sales/my-kpi GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
