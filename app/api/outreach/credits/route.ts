import { supabaseAdmin } from '../../../lib/supabase/server';
import { CREDIT_PACKAGES, SUBSCRIPTION_TIERS } from '../../../lib/constants';
import { getServerUser } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export { SUBSCRIPTION_TIERS };

export async function deductCredit(
  userId: string,
  amount = 1,
): Promise<{ success: boolean; remainingCredits: number; wasFree: boolean; error?: string }> {
  const { data: profile } = await db
    .from('user_profiles')
    .select('credits_remaining, plan_type')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { success: false, remainingCredits: 0, wasFree: false, error: 'User profile not found' };
  }

  if (profile.plan_type === 'elite') {
    return { success: true, remainingCredits: profile.credits_remaining, wasFree: true };
  }

  const { count: emailCount } = await db
    .from('outreach_emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const wasFree = (emailCount ?? 0) === 0;
  if (wasFree) return { success: true, remainingCredits: profile.credits_remaining, wasFree: true };

  if (profile.credits_remaining < amount) {
    return {
      success: false,
      remainingCredits: profile.credits_remaining,
      wasFree: false,
      error: `积分不足。当前余额 ${profile.credits_remaining}，需要 ${amount}。`,
    };
  }

  const newBalance = profile.credits_remaining - amount;

  await db.from('user_profiles').update({
    credits_remaining: newBalance,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);

  await db.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    type: 'spend_email',
    description: '生成套磁信',
  });

  return { success: true, remainingCredits: newBalance, wasFree: false };
}

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await db
      .from('user_profiles')
      .select('credits_remaining, plan_type')
      .eq('id', user.id)
      .single();

    if (!profile) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({
      creditBalance: profile.credits_remaining,
      subscriptionTier: profile.plan_type || 'free',
      packages: CREDIT_PACKAGES,
      tiers: SUBSCRIPTION_TIERS,
    });
  } catch (error) {
    console.error('[credits/GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  return Response.json(
    { redirect: '/koala/pricing#credit-packs', message: 'Please use the pricing page to purchase credits via Stripe.' },
    { status: 303 },
  );
}
