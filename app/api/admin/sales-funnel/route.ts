import { NextRequest } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const days = parseInt(sp.get('days') || '30');
  const agentId = sp.get('agent_id') || '';

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    let visitsQ = db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('is_test', false).gte('visited_at', sinceISO);
    let referralsQ = db.from('sales_referrals').select('id, referred_user_id', { count: 'exact' }).eq('is_test', false).gte('created_at', sinceISO);
    let commissionsQ = db.from('sales_commissions').select('id', { count: 'exact', head: true }).gte('created_at', sinceISO).neq('status', 'rejected');

    if (agentId) {
      visitsQ = visitsQ.eq('agent_id', agentId);
      referralsQ = referralsQ.eq('agent_id', agentId);
      commissionsQ = commissionsQ.eq('agent_id', agentId);
    }

    const [visitsRes, referralsRes, commissionsRes] = await Promise.all([
      visitsQ,
      referralsQ,
      commissionsQ,
    ]);

    const visits = visitsRes.count ?? 0;
    const registrations = referralsRes.count ?? 0;
    const paid = commissionsRes.count ?? 0;

    // Trial = referred users who started at least 1 AI conversation
    let trial = 0;
    const referredUserIds: string[] = (referralsRes.data ?? [])
      .map((r: { referred_user_id: string }) => r.referred_user_id)
      .filter(Boolean);

    if (referredUserIds.length > 0) {
      const { data: convoUsers } = await db
        .from('ai_conversations')
        .select('user_id')
        .in('user_id', referredUserIds)
        .gte('created_at', sinceISO);

      const uniqueTrialUsers = new Set(
        (convoUsers ?? []).map((c: { user_id: string }) => c.user_id)
      );
      trial = uniqueTrialUsers.size;
    }

    // Daily breakdown for trend chart
    const { data: dailyVisits } = await (agentId
      ? db.from('sales_visits').select('visited_at').eq('agent_id', agentId).eq('is_test', false).gte('visited_at', sinceISO)
      : db.from('sales_visits').select('visited_at').eq('is_test', false).gte('visited_at', sinceISO));

    const { data: dailyRefs } = await (agentId
      ? db.from('sales_referrals').select('created_at').eq('agent_id', agentId).eq('is_test', false).gte('created_at', sinceISO)
      : db.from('sales_referrals').select('created_at').eq('is_test', false).gte('created_at', sinceISO));

    const dayMap: Record<string, { visits: number; registrations: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = { visits: 0, registrations: 0 };
    }
    for (const v of dailyVisits ?? []) {
      const d = new Date(v.visited_at).toISOString().slice(0, 10);
      if (dayMap[d]) dayMap[d].visits++;
    }
    for (const r of dailyRefs ?? []) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      if (dayMap[d]) dayMap[d].registrations++;
    }
    const trend = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date: date.slice(5), ...counts }));

    // Agent list for filter dropdown
    const { data: agents } = await db
      .from('sales_agents')
      .select('id, user_id, user_profiles:user_id(display_name, email)')
      .eq('status', 'active');

    const agentList = (agents ?? []).map((a: { id: string; user_profiles: { display_name: string; email: string } }) => ({
      id: a.id,
      display_name: a.user_profiles?.display_name || a.user_profiles?.email?.split('@')[0] || '未知',
    }));

    return Response.json({
      funnel: { visits, registrations, trial, paid },
      trend,
      agents: agentList,
    });
  } catch (e) {
    console.error('[admin/sales-funnel]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
