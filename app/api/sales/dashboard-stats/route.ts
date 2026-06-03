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
      .select('id, name, referral_code, tier')
      .eq('user_id', result.user.id)
      .eq('status', 'active')
      .single();

    if (!agent) return Response.json({ error: 'Not a sales agent' }, { status: 403 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    // Team-ranking params (additive; defaults month/rate). Only affect team_ranking_full + meta.
    const sp = new URL(req.url).searchParams;
    const period: 'week' | 'month' = sp.get('period') === 'week' ? 'week' : 'month';
    const sortMode: 'rate' | 'commission' = sp.get('sort') === 'commission' ? 'commission' : 'rate';
    const dow = now.getDay(); // 0=Sun..6=Sat
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((dow + 6) % 7)).toISOString(); // Monday 00:00
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const periodStart = period === 'week' ? weekStart : monthStart;
    const todayStr = now.toISOString().split('T')[0];

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
      offlineThis,
    ] = await Promise.all([
      db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).eq('is_test', false).gte('visited_at', monthStart),
      db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).eq('is_test', false).gte('visited_at', lastMonthStart).lte('visited_at', lastMonthEnd),
      db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).eq('is_test', false).gte('created_at', monthStart),
      db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).eq('is_test', false).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
      db.from('sales_commissions').select('commission_amount, status').eq('agent_id', agent.id).gte('created_at', monthStart).neq('status', 'rejected'),
      db.from('sales_commissions').select('commission_amount, status').eq('agent_id', agent.id).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd).neq('status', 'rejected'),
      db.from('sales_kpi_targets').select('*').eq('agent_id', agent.id).lte('effective_from', now.toISOString().split('T')[0]).gte('effective_until', now.toISOString().split('T')[0]).order('effective_from', { ascending: false }).limit(1),
      db.from('sales_visits').select('visited_at').eq('agent_id', agent.id).eq('is_test', false).gte('visited_at', thirtyDaysAgo).order('visited_at', { ascending: true }),
      db.from('sales_referrals').select('created_at').eq('agent_id', agent.id).eq('is_test', false).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: true }),
      db.from('sales_agents').select('id, name, display_name, referral_code, tier').eq('status', 'active'),
      db.from('sales_visits').select('channel').eq('agent_id', agent.id).eq('is_test', false).gte('visited_at', monthStart),
      db.from('sales_commissions').select('created_at, commission_amount, status, product_type, sales_referrals(referred_user_id, user_profiles:referred_user_id(display_name, email))').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(5),
      db.from('sales_commissions').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', monthStart).neq('status', 'rejected'),
      db.from('sales_commissions').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).gte('created_at', monthStart).neq('status', 'rejected').in('product_type', ['sub_starter', 'sub_pro', 'sub_elite']),
      db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id).eq('is_test', false).eq('offline_converted', true).gte('offline_converted_at', monthStart),
    ]);

    const commsThisData = commsThis.data || [];
    const commsLastData = commsLast.data || [];
    const commissionThis = commsThisData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
    const commissionLast = commsLastData.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
    const target = targets.data?.[0] || null;

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

    // ===== Full team ranking: KPI 综合达成率 + commission, week/month, dual sort =====
    type RankRow = {
      agent_id: string; display_name: string; referral_code: string; tier: string;
      is_me: boolean; rank: number | null; has_targets: boolean; achievement_rate: number | null;
      commission_month: number; commission_total: number;
      kpi: Record<'visits' | 'registrations' | 'payments' | 'offline', { actual: number; target: number }>;
    };
    let teamRankingFull: RankRow[] = [];
    let meta = { period, sort: sortMode, my_rank: null as number | null, total: 0 };
    if (agentIds.length > 0) {
      const [visitRows, refRows, payRows, offRows, monthCommRows, totalCommRows, targetRows] = await Promise.all([
        db.from('sales_visits').select('agent_id').in('agent_id', agentIds).eq('is_test', false).gte('visited_at', periodStart),
        db.from('sales_referrals').select('agent_id').in('agent_id', agentIds).eq('is_test', false).gte('created_at', periodStart),
        db.from('sales_commissions').select('agent_id').in('agent_id', agentIds).neq('status', 'rejected').gte('created_at', periodStart),
        db.from('sales_referrals').select('agent_id').in('agent_id', agentIds).eq('is_test', false).eq('offline_converted', true).gte('offline_converted_at', periodStart),
        db.from('sales_commissions').select('agent_id, commission_amount').in('agent_id', agentIds).neq('status', 'rejected').gte('created_at', monthStart),
        db.from('sales_commissions').select('agent_id, commission_amount').in('agent_id', agentIds).neq('status', 'rejected'),
        db.from('sales_kpi_targets').select('agent_id, kpi_1_visits, kpi_2_registrations, kpi_3_payments, kpi_4_offline, effective_from').in('agent_id', agentIds).lte('effective_from', todayStr).gte('effective_until', todayStr).order('effective_from', { ascending: false }),
      ]);
      const countBy = (rows: any[]) => { const m: Record<string, number> = {}; for (const r of rows || []) m[r.agent_id] = (m[r.agent_id] || 0) + 1; return m; };
      const sumBy = (rows: any[]) => { const m: Record<string, number> = {}; for (const r of rows || []) m[r.agent_id] = (m[r.agent_id] || 0) + (r.commission_amount || 0); return m; };
      const visitC = countBy(visitRows.data), refC = countBy(refRows.data), payC = countBy(payRows.data), offC = countBy(offRows.data);
      const monthComm = sumBy(monthCommRows.data), totalComm = sumBy(totalCommRows.data);
      const targetBy: Record<string, any> = {};
      for (const t of (targetRows.data || [])) { if (!targetBy[t.agent_id]) targetBy[t.agent_id] = t; } // rows ordered desc → first = latest effective

      const WEIGHTS: Record<string, number> = { visits: 0.15, registrations: 0.25, payments: 0.40, offline: 0.20 };
      const wk = (m: number) => Math.round((m || 0) * 7 / daysInMonth); // weekly target from month target

      teamRankingFull = (allAgents.data || []).map((a: any) => {
        const t = targetBy[a.id];
        const monthT = { visits: t?.kpi_1_visits || 0, registrations: t?.kpi_2_registrations || 0, payments: t?.kpi_3_payments || 0, offline: t?.kpi_4_offline || 0 };
        const tgt = period === 'week'
          ? { visits: wk(monthT.visits), registrations: wk(monthT.registrations), payments: wk(monthT.payments), offline: wk(monthT.offline) }
          : monthT;
        const act = { visits: visitC[a.id] || 0, registrations: refC[a.id] || 0, payments: payC[a.id] || 0, offline: offC[a.id] || 0 };
        let wsum = 0, acc = 0;
        (['visits', 'registrations', 'payments', 'offline'] as const).forEach(k => {
          if (tgt[k] > 0) { wsum += WEIGHTS[k]; acc += WEIGHTS[k] * Math.min(act[k] / tgt[k], 1.5); } // drop zero-target, cap 150%
        });
        const has_targets = wsum > 0;
        return {
          agent_id: a.id,
          display_name: a.display_name || a.name || '未知',
          referral_code: a.referral_code || '',
          tier: a.tier || 'standard',
          is_me: a.id === agent.id,
          rank: null,
          has_targets,
          achievement_rate: has_targets ? Math.round((acc / wsum) * 100) : null, // null (not 0) when no targets
          commission_month: Math.round((monthComm[a.id] || 0) * 100) / 100,
          commission_total: Math.round((totalComm[a.id] || 0) * 100) / 100,
          kpi: {
            visits: { actual: act.visits, target: tgt.visits },
            registrations: { actual: act.registrations, target: tgt.registrations },
            payments: { actual: act.payments, target: tgt.payments },
            offline: { actual: act.offline, target: tgt.offline },
          },
        };
      });

      if (sortMode === 'commission') {
        teamRankingFull.sort((a, b) => b.commission_month - a.commission_month);
        teamRankingFull.forEach((r, i) => { r.rank = i + 1; });
      } else {
        const withT = teamRankingFull.filter(r => r.has_targets).sort((a, b) => (b.achievement_rate! - a.achievement_rate!) || (b.commission_month - a.commission_month));
        const without = teamRankingFull.filter(r => !r.has_targets).sort((a, b) => b.commission_month - a.commission_month);
        withT.forEach((r, i) => { r.rank = i + 1; }); // unset-target agents keep rank=null, appended last
        teamRankingFull = [...withT, ...without];
      }

      meta = { period, sort: sortMode, total: teamRankingFull.length, my_rank: teamRankingFull.find(r => r.is_me)?.rank ?? null };
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
      offline: offlineThis.count || 0,
    };

    const visitsCurrent = visitsThis.count || 0;
    const visitsLastMonth = visitsLast.count || 0;
    const refsCurrent = refsThis.count || 0;
    const refsLastMonth = refsLast.count || 0;

    return Response.json({
      agent: {
        display_name: agent.name || result.user.email?.split('@')[0] || '',
        referral_code: agent.referral_code,
        tier: agent.tier || 'standard',
      },
      kpi: {
        commission: {
          current: Math.round(commissionThis * 100) / 100,
          last_month: Math.round(commissionLast * 100) / 100,
          change_pct: commissionLast > 0 ? Math.round(((commissionThis - commissionLast) / commissionLast) * 100) : 0,
        },
        visits: {
          current: visitsCurrent,
          target: target?.kpi_1_visits || 0,
          pct: target?.kpi_1_visits > 0 ? Math.round((visitsCurrent / target.kpi_1_visits) * 100) : 0,
        },
        registrations: {
          current: refsCurrent,
          target: target?.kpi_2_registrations || 0,
          pct: target?.kpi_2_registrations > 0 ? Math.round((refsCurrent / target.kpi_2_registrations) * 100) : 0,
        },
        conversions: {
          current: commsThisData.length,
          target: target?.kpi_3_payments || 0,
          pct: target?.kpi_3_payments > 0 ? Math.round((commsThisData.length / target.kpi_3_payments) * 100) : 0,
          rate: refsCurrent > 0 ? Math.round((commsThisData.length / refsCurrent) * 1000) / 10 : 0,
        },
        offline: {
          current: offlineThis.count || 0,
          target: target?.kpi_4_offline || 0,
          pct: target?.kpi_4_offline > 0 ? Math.round(((offlineThis.count || 0) / target.kpi_4_offline) * 100) : 0,
        },
      },
      trend_30d: trend30d,
      team_ranking: teamRanking,
      team_ranking_full: teamRankingFull,
      meta,
      channel_breakdown: channelBreakdown,
      funnel,
      recent_commissions: (recentComms.data || []).map((c: any) => ({
        date: c.created_at,
        user_name: c.sales_referrals?.user_profiles?.display_name || c.sales_referrals?.user_profiles?.email || '未知用户',
        product: c.product_type || '',
        amount: Math.round((c.commission_amount || 0) * 100) / 100,
        status: c.status,
      })),
      // Legacy fields for backward compat
      visits: { current: visitsCurrent, lastMonth: visitsLastMonth, target: target?.kpi_1_visits || 0 },
      registrations: { current: refsCurrent, lastMonth: refsLastMonth, target: target?.kpi_2_registrations || 0 },
      conversions: { current: commsThisData.length, lastMonth: commsLastData.length, target: target?.kpi_3_payments || 0 },
      commission: { current: Math.round(commissionThis * 100) / 100, lastMonth: Math.round(commissionLast * 100) / 100, target: target?.kpi_3_revenue || 0 },
    });
  } catch (error) {
    console.error('[sales/dashboard-stats]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
