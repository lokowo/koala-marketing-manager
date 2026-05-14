import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';
import { SUBSCRIPTION_TIERS } from '../../../lib/constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [activeRes, newThisMonthRes, canceledThisMonthRes, payingUsersRes] = await Promise.all([
      db.from('subscriptions')
        .select('tier, status, user_id')
        .eq('status', 'active'),
      db.from('subscriptions')
        .select('id')
        .eq('status', 'active')
        .gte('created_at', monthStart),
      db.from('subscriptions')
        .select('id')
        .eq('status', 'canceled')
        .gte('updated_at', monthStart),
      db.from('subscriptions')
        .select('user_id, tier, status, cancel_at_period_end, current_period_end, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const activeSubs = activeRes.data ?? [];
    const byTier: Record<string, number> = { starter: 0, pro: 0, elite: 0 };
    let mrr = 0;

    for (const sub of activeSubs) {
      byTier[sub.tier] = (byTier[sub.tier] || 0) + 1;
      const tier = SUBSCRIPTION_TIERS[sub.tier as keyof typeof SUBSCRIPTION_TIERS];
      if (tier) mrr += tier.price;
    }

    const userIds = [...new Set((payingUsersRes.data ?? []).map((s: { user_id: string }) => s.user_id))];
    let userMap: Record<string, { email: string; display_name: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('user_profiles')
        .select('id, email, display_name')
        .in('id', userIds);

      for (const p of (profiles ?? [])) {
        userMap[p.id] = { email: p.email, display_name: p.display_name };
      }
    }

    const subscribers = (payingUsersRes.data ?? []).map((sub: {
      user_id: string;
      tier: string;
      status: string;
      cancel_at_period_end: boolean;
      current_period_end: string;
      created_at: string;
    }) => ({
      ...sub,
      email: userMap[sub.user_id]?.email || '',
      display_name: userMap[sub.user_id]?.display_name || '',
    }));

    return Response.json({
      stats: {
        totalActive: activeSubs.length,
        byTier,
        mrr: Math.round(mrr * 100) / 100,
        newThisMonth: newThisMonthRes.data?.length ?? 0,
        canceledThisMonth: canceledThisMonthRes.data?.length ?? 0,
      },
      subscribers,
    });
  } catch (error) {
    console.error('[admin/subscribers]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
