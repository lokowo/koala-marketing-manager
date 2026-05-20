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
      .select('id, name, referral_code')
      .eq('user_id', result.user.id)
      .eq('status', 'active')
      .single();

    if (!agent) return Response.json({ error: 'Not a sales agent' }, { status: 403 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const [
      visitsThis, visitsLast,
      refsThis, refsLast,
      commsThis, commsLast,
      targets,
      trendVisits, trendRefs,
      allAgents,
      channelData,
      recentComms,
      funnelPayments, funnelRenewals,
    ] = await Promise.all([
      db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('visited_at', monthStart),
      db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('visited_at', lastMonthStart).lte('visited_at', lastMonthEnd),
      db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', monthStart),
      db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
      db.from('sales_commissions').select('commission_amount, status').eq('agent_id', agent.id).gte('created_at', monthStart).neq('status', 'rejected'),
      db.from('sales_commissions').select('commission_amount, status').eq('agent_id', agent.id).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd).neq('status', 'rejected'),
      db.from('sales_kpi_targets').select('*').eq('agent_id', agent.id).lte('period_start', now.toISOString().split('T')[0]).gte('period_end', now.toISOString().split('T')[0]).maybeSingle(),
      db.from('sales_visits').select('visited_at').eq('agent_id', agent.id).gte('visited_at', thirtyDaysAgo).order('visited_at', { ascending: true }),
      db.from('sales_referrals').select('created_at').eq('agent_id', agent.id).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: true }),
      db.from('sales_agents').select('id, name').eq('status', 'active'),
      db.from('sales_visits').select('channel').eq('agent_id', agent.id).gte('visited_at', monthStart),
      db.from('sales_commissions').select('created_at, commission_amount, status, product_type, user_name').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(5),
      db.from('sales_commissions').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', monthStart).neq('status', 'rejected'),
      db.from('sales_commissions').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', monthStart).neq('status', 'rejected').in('product_type', ['sub_starter', 'sub_pro', 'sub_elite']),
    ]);

    const commsThisData = commsThis.data || [];
    const commsLastData = commsLast.data || [];
    const commissionThis = commsThisData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
    const commissionLast = commsLastData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
    const target = targets.data;

    // Build 30-day trend
    const trend30d: { date: string; visits: number; registrations: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      trend30d.push({ date: dateStr, visits: 0, registrations: 0 });
    }
    for (const v of (trendVisits.data || [])) {
      const dateStr = new Date(v.visited_at).toISOString().split('T')[0];
      const entry = trend30d.find(t => t.date === dateStr);
      if (entry) entry.visits++;
    }
    for (const r of (trendRefs.data || [])) {
      const dateStr = new Date(r.created_at).toISOString().split('T')[0];
      const entry = trend30d.find(t => t.date === dateStr);
      if (entry) entry.registrations++;
    }

    // Team ranking by monthly commission
    const agentIds = (allAgents.data || []).map((a: any) => a.id);
    let teamRanking: { rank: number; name: string; commission: number; is_me: boolean }[] = [];
    if (agentIds.length > 0) {
      const { data: allComms } = await db.from('sales_commissions')
        .select('agent_id, commission_amount')
        .in('agent_id', agentIds)
        .gte('created_at', monthStart)
        .neq('status', 'rejected');
      const byAgent: Record<string, number> = {};
      for (const c of (allComms || [])) {
        byAgent[c.agent_id] = (byAgent[c.agent_id] || 0) + (c.commission_amount || 0);
      }
      const agentMap = Object.fromEntries((allAgents.data || []).map((a: any) => [a.id, a.name || '未知']));
      teamRanking = Object.entries(byAgent)
        .map(([id, comm]) => ({ name: agentMap[id] || '未知', commission: Math.round(comm * 100) / 100, is_me: id === agent.id }))
        .sort((a, b) => b.commission - a.commission)
        .slice(0, 5)
        .map((item, i) => ({ ...item, rank: i + 1 }));
      if (!teamRanking.some(r => r.is_me)) {
        const myIdx = Object.entries(byAgent).sort(([, a], [, b]) => b - a).findIndex(([id]) => id === agent.id);
        if (myIdx >= 0) {
          teamRanking.push({ rank: myIdx + 1, name: agentMap[agent.id] || '未知', commission: Math.round((byAgent[agent.id] || 0) * 100) / 100, is_me: true });
        }
      }
    }

    // Channel breakdown
    const channelCounts: Record<string, number> = {};
    for (const v of (channelData.data || [])) {
      const ch = v.channel || 'other';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }
    const totalChannelVisits = Object.values(channelCounts).reduce((s, v) => s + v, 0) || 1;
    const channelBreakdown = Object.entries(channelCounts)
      .map(([channel, visits]) => ({ channel, visits, pct: Math.round((visits / totalChannelVisits) * 100) }))
      .sort((a, b) => b.visits - a.visits);

    // Funnel
    const funnel = {
      visits: visitsThis.count || 0,
      registrations: refsThis.count || 0,
      payments: funnelPayments.count || 0,
      renewals: funnelRenewals.count || 0,
    };

    const visitsCurrent = visitsThis.count || 0;
    const visitsLastMonth = visitsLast.count || 0;
    const refsCurrent = refsThis.count || 0;
    const refsLastMonth = refsLast.count || 0;

    return Response.json({
      agent: {
        display_name: agent.name || result.user.email?.split('@')[0] || '',
        referral_code: agent.referral_code,
        tier: 'bronze',
      },
      kpi: {
        commission: {
          current: Math.round(commissionThis * 100) / 100,
          last_month: Math.round(commissionLast * 100) / 100,
          change_pct: commissionLast > 0 ? Math.round(((commissionThis - commissionLast) / commissionLast) * 100) : 0,
        },
        visits: {
          current: visitsCurrent,
          target: target?.target_visits || 0,
          pct: target?.target_visits > 0 ? Math.round((visitsCurrent / target.target_visits) * 100) : 0,
        },
        registrations: {
          current: refsCurrent,
          target: target?.target_registrations || 0,
          pct: target?.target_registrations > 0 ? Math.round((refsCurrent / target.target_registrations) * 100) : 0,
        },
        conversions: {
          current: commsThisData.length,
          rate: refsCurrent > 0 ? Math.round((commsThisData.length / refsCurrent) * 1000) / 10 : 0,
        },
      },
      trend_30d: trend30d,
      team_ranking: teamRanking,
      channel_breakdown: channelBreakdown,
      funnel,
      recent_commissions: (recentComms.data || []).map((c: any) => ({
        date: c.created_at,
        user_name: c.user_name || '未知用户',
        product: c.product_type || '',
        amount: Math.round((c.commission_amount || 0) * 100) / 100,
        status: c.status,
      })),
      // Legacy fields for backward compat
      visits: { current: visitsCurrent, lastMonth: visitsLastMonth, target: target?.target_visits || 0 },
      registrations: { current: refsCurrent, lastMonth: refsLastMonth, target: target?.target_registrations || 0 },
      conversions: { current: commsThisData.length, lastMonth: commsLastData.length, target: target?.target_conversions || 0 },
      commission: { current: Math.round(commissionThis * 100) / 100, lastMonth: Math.round(commissionLast * 100) / 100, target: target?.target_revenue || 0 },
    });
  } catch (error) {
    console.error('[sales/dashboard-stats]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
