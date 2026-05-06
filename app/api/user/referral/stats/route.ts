import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { count } = await db
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', user.id);

    const { data: txns } = await db
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'earn_referral');

    const earned = (txns || []).reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0);

    return Response.json({
      invited: count || 0,
      maxInvites: 3,
      earned,
    });
  } catch (e) {
    console.error('[referral/stats]', e);
    return Response.json({ error: '获取失败' }, { status: 500 });
  }
}
