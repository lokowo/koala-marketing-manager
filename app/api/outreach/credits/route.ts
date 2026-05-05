import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { CREDIT_PRICES, SUBSCRIPTION_TIERS } from '../../../lib/constants';

// Supabase client typed as any for tables not yet in database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── Credit packages (à-la-carte) ────────────────────────────────────────────

export const CREDIT_PACKAGES = [
  { id: 'single',   credits: 1,   priceAUD: CREDIT_PRICES.single,  label: '单封',    description: '1 封定制申请信' },
  { id: 'pack_10',  credits: 10,  priceAUD: CREDIT_PRICES.pack10,  label: '10 封包', description: '省 $0.10/封' },
  { id: 'pack_30',  credits: 30,  priceAUD: CREDIT_PRICES.pack30,  label: '30 封包', description: '省 $0.34/封', popular: true },
  { id: 'pack_100', credits: 100, priceAUD: CREDIT_PRICES.pack100, label: '100 封包', description: '省 $0.51/封' },
] as const;

// Re-export canonical subscription tiers from constants
export { SUBSCRIPTION_TIERS };

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * Check balance and deduct one credit.
 * The first email per user is always free (wasFree=true).
 */
export async function deductCredit(
  userId: string,
  amount = 1,
): Promise<{ success: boolean; remainingCredits: number; wasFree: boolean; error?: string }> {
  const { data: credits } = await db
    .from('user_credits')
    .select('credit_balance, subscription_tier, subscription_monthly_credits')
    .eq('user_id', userId)
    .single();

  if (!credits) {
    return { success: false, remainingCredits: 0, wasFree: false, error: 'User credits record not found' };
  }

  const { count: emailCount } = await db
    .from('outreach_emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const wasFree = (emailCount ?? 0) === 0;
  if (wasFree) return { success: true, remainingCredits: credits.credit_balance, wasFree: true };

  if (credits.credit_balance < amount) {
    return {
      success: false,
      remainingCredits: credits.credit_balance,
      wasFree: false,
      error: `积分不足。当前余额 ${credits.credit_balance}，需要 ${amount}。`,
    };
  }

  const { data: updated } = await db
    .from('user_credits')
    .update({ credit_balance: credits.credit_balance - amount })
    .eq('user_id', userId)
    .select('credit_balance')
    .single();

  return { success: true, remainingCredits: updated?.credit_balance ?? 0, wasFree: false };
}

// ─── GET /api/outreach/credits ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: credits } = await db
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!credits) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({
      creditBalance: credits.credit_balance,
      subscriptionTier: credits.subscription_tier,
      subscriptionMonthlyCredits: credits.subscription_monthly_credits,
      subscriptionExpiresAt: credits.subscription_expires_at,
      packages: CREDIT_PACKAGES,
      tiers: SUBSCRIPTION_TIERS,
    });
  } catch (error) {
    console.error('[credits/GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/outreach/credits ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { packageId?: string };
    const pkg = CREDIT_PACKAGES.find(p => p.id === body.packageId);
    if (!pkg) return Response.json({ error: 'Invalid package' }, { status: 400 });

    // TODO: integrate Stripe checkout session
    return Response.json(
      { message: 'Payment integration coming soon. Contact support to purchase credits.', package: pkg },
      { status: 501 },
    );
  } catch (error) {
    console.error('[credits/POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
