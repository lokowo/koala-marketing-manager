import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: agents } = await db
      .from('sales_agents').select('id, user_id, referral_code, user_profiles:user_id(display_name, email)')
      .eq('status', 'active');

    if (!agents || agents.length === 0) {
      return Response.json({ team_totals: { kpi1: { current: 0, target: 0 }, kpi2: { current: 0, target: 0 }, kpi3: { current: 0, target: 0 }, kpi4: { current: 0, target: 0 } }, agents: [] });
    }

    const agentIds = agents.map((a: any) => a.id);

    const [visitsRes, refsRes, commsRes, offlineRes, targetsRes] = await Promise.all([
      db.from('sales_visits').select('agent_id').in('agent_id', agentIds).gte('visited_at', monthStart),
      db.from('sales_referrals').select('agent_id').in('agent_id', agentIds).gte('created_at', monthStart),
      db.from('sales_commissions').select('agent_id, commission_amount').in('agent_id', agentIds).gte('created_at', monthStart).neq('status', 'rejected'),
      db.from('sales_referrals').select('agent_id').in('agent_id', agentIds).eq('offline_converted', true).gte('offline_converted_at', monthStart),
      db.from('sales_kpi_targets').select('*').in('agent_id', agentIds).lte('effective_from', today).gte('effective_until', today),
    ]);

    const countByAgent = (rows: any[], field = 'agent_id') => {
      const m: Record<string, number> = {};
      for (const r of (rows || [])) m[r[field]] = (m[r[field]] || 0) + 1;
      return m;
    };

    const visitsByAgent = countByAgent(visitsRes.data);
    const refsByAgent = countByAgent(refsRes.data);
    const offlineByAgent = countByAgent(offlineRes.data);

    const commsByAgent: Record<string, number> = {};
    const commAmtByAgent: Record<string, number> = {};
    for (const c of (commsRes.data || [])) {
      commsByAgent[c.agent_id] = (commsByAgent[c.agent_id] || 0) + 1;
      commAmtByAgent[c.agent_id] = (commAmtByAgent[c.agent_id] || 0) + (c.commission_amount || 0);
    }

    const targetsByAgent: Record<string, any> = {};
    for (const t of (targetsRes.data || [])) targetsByAgent[t.agent_id] = t;

    let teamTarget = { kpi1: 0, kpi2: 0, kpi3: 0, kpi4: 0 };
    let teamCurrent = { kpi1: 0, kpi2: 0, kpi3: 0, kpi4: 0 };

    const agentData = agents.map((a: any) => {
      const t = targetsByAgent[a.id];
      const k1c = visitsByAgent[a.id] || 0;
      const k2c = refsByAgent[a.id] || 0;
      const k3c = commsByAgent[a.id] || 0;
      const k4c = offlineByAgent[a.id] || 0;
      const k1t = t?.kpi_1_visits || 0;
      const k2t = t?.kpi_2_registrations || 0;
      const k3t = t?.kpi_3_payments || 0;
      const k4t = t?.kpi_4_offline || 0;

      teamCurrent.kpi1 += k1c; teamCurrent.kpi2 += k2c; teamCurrent.kpi3 += k3c; teamCurrent.kpi4 += k4c;
      teamTarget.kpi1 += k1t; teamTarget.kpi2 += k2t; teamTarget.kpi3 += k3t; teamTarget.kpi4 += k4t;

      const pct = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;
      const k1p = pct(k1c, k1t), k2p = pct(k2c, k2t), k3p = pct(k3c, k3t), k4p = pct(k4c, k4t);
      const overall = Math.round(k1p * 0.15 + k2p * 0.25 + k3p * 0.35 + k4p * 0.25);

      return {
        id: a.id,
        name: a.user_profiles?.display_name || a.user_profiles?.email?.split('@')[0] || '未知',
        referral_code: a.referral_code,
        kpi1: { current: k1c, target: k1t, pct: k1p },
        kpi2: { current: k2c, target: k2t, pct: k2p },
        kpi3: { current: k3c, target: k3t, pct: k3p },
        kpi4: { current: k4c, target: k4t, pct: k4p },
        revenue: Math.round((commAmtByAgent[a.id] || 0) * 100) / 100,
        overall_pct: overall,
      };
    });

    agentData.sort((a: any, b: any) => b.overall_pct - a.overall_pct);

    const pct = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;

    return Response.json({
      team_totals: {
        kpi1: { current: teamCurrent.kpi1, target: teamTarget.kpi1, pct: pct(teamCurrent.kpi1, teamTarget.kpi1) },
        kpi2: { current: teamCurrent.kpi2, target: teamTarget.kpi2, pct: pct(teamCurrent.kpi2, teamTarget.kpi2) },
        kpi3: { current: teamCurrent.kpi3, target: teamTarget.kpi3, pct: pct(teamCurrent.kpi3, teamTarget.kpi3) },
        kpi4: { current: teamCurrent.kpi4, target: teamTarget.kpi4, pct: pct(teamCurrent.kpi4, teamTarget.kpi4) },
      },
      agents: agentData,
    });
  } catch (error) {
    console.error('[admin/sales-kpi-overview]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
