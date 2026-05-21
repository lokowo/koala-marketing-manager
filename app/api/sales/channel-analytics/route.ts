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
    const days = parseInt(searchParams.get('days') || '30');
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [visitsRes, referralsRes, commissionsRes] = await Promise.all([
      db.from('sales_visits').select('channel').eq('agent_id', agent.id).gte('visited_at', since),
      db.from('sales_referrals').select('channel').eq('agent_id', agent.id).gte('created_at', since),
      db.from('sales_commissions').select('product_type, commission_amount, status, sales_referrals(channel)')
        .eq('agent_id', agent.id).gte('created_at', since).neq('status', 'rejected'),
    ]);

    const visits = visitsRes.data || [];
    const referrals = referralsRes.data || [];
    const commissions = commissionsRes.data || [];

    const channelMap: Record<string, { visits: number; registrations: number; conversions: number; revenue: number }> = {};

    for (const v of visits) {
      const ch = v.channel || 'unknown';
      if (!channelMap[ch]) channelMap[ch] = { visits: 0, registrations: 0, conversions: 0, revenue: 0 };
      channelMap[ch].visits++;
    }

    for (const r of referrals) {
      const ch = r.channel || 'unknown';
      if (!channelMap[ch]) channelMap[ch] = { visits: 0, registrations: 0, conversions: 0, revenue: 0 };
      channelMap[ch].registrations++;
    }

    for (const c of commissions) {
      const ch = c.sales_referrals?.channel || 'unknown';
      if (!channelMap[ch]) channelMap[ch] = { visits: 0, registrations: 0, conversions: 0, revenue: 0 };
      channelMap[ch].conversions++;
      channelMap[ch].revenue += c.commission_amount || 0;
    }

    const totalConversions = commissions.length;
    const totalRevenue = commissions.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);

    const channels = Object.entries(channelMap).map(([channel, data]) => ({
      channel,
      ...data,
      conversion_rate: data.registrations > 0 ? ((data.conversions / data.registrations) * 100).toFixed(1) : '0.0',
    }));

    channels.sort((a, b) => b.visits - a.visits);

    const totalVisits = visits.length;
    const totalRegistrations = referrals.length;

    return Response.json({
      channels,
      totals: { visits: totalVisits, registrations: totalRegistrations, conversions: totalConversions, revenue: Math.round(totalRevenue * 100) / 100 },
      funnel: {
        visits: totalVisits,
        registrations: totalRegistrations,
        conversions: totalConversions,
        renewals: 0,
      },
    });
  } catch (error) {
    console.error('[sales/channel-analytics]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
