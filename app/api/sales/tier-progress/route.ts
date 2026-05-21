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
      .select('id, tier')
      .eq('user_id', result.user.id)
      .eq('status', 'active')
      .single();

    if (!agent) return Response.json({ error: 'Not a sales agent' }, { status: 403 });

    const [commRes, rulesRes] = await Promise.all([
      db.from('sales_commissions').select('commission_amount').eq('agent_id', agent.id).in('status', ['confirmed', 'paid_out']),
      db.from('sales_tier_rules').select('*').order('min_commission', { ascending: true }),
    ]);

    const totalCommission = (commRes.data || []).reduce((s: number, c: { commission_amount: number }) => s + Number(c.commission_amount), 0);
    const currentTier = agent.tier || 'standard';

    const tierOrder = ['standard', 'senior', 'partner'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const rules = rulesRes.data || [];

    let nextTier: string | null = null;
    let nextMinCommission = 0;

    if (currentIndex < tierOrder.length - 1) {
      const nextTierName = tierOrder[currentIndex + 1];
      const rule = rules.find((r: { tier: string }) => r.tier === nextTierName);
      if (rule) {
        nextTier = nextTierName;
        nextMinCommission = Number(rule.min_commission);
      }
    }

    return Response.json({
      current_tier: currentTier,
      total_commission: Math.round(totalCommission * 100) / 100,
      next_tier: nextTier,
      next_min_commission: nextMinCommission,
    });
  } catch (error) {
    console.error('[sales/tier-progress GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
