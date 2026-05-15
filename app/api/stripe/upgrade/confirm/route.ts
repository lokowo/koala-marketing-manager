import { getServerUser } from '../../../../lib/auth';
import { getStripe, getUserActiveSubscription } from '../../../../lib/server/stripe';
import { SUBSCRIPTION_TIERS, type SubscriptionTierId } from '../../../../lib/constants';
import { addCredits, idempotentCheck } from '../../../../lib/server/credits';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetTierId } = await req.json() as { targetTierId: string };
    const targetTier = SUBSCRIPTION_TIERS[targetTierId as SubscriptionTierId];
    if (!targetTier) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const subscription = await getUserActiveSubscription(user.id);
    if (!subscription) {
      return Response.json({ error: 'No active subscription' }, { status: 400 });
    }

    const currentTier = SUBSCRIPTION_TIERS[subscription.tier as SubscriptionTierId];
    if (!currentTier) {
      return Response.json({ error: 'Current tier not found' }, { status: 400 });
    }

    if (subscription.tier === targetTierId) {
      return Response.json({ error: 'Already on this plan' }, { status: 400 });
    }

    const s = getStripe();
    const stripeSub = await s.subscriptions.retrieve(subscription.stripe_subscription_id);
    const currentItem = stripeSub.items.data[0];

    if (targetTier.price > currentTier.price) {
      await s.subscriptions.update(subscription.stripe_subscription_id, {
        items: [{ id: currentItem.id, price: targetTier.stripePriceId }],
        proration_behavior: 'create_prorations',
      });

      await db.from('subscriptions').update({
        tier: targetTier.id,
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', subscription.stripe_subscription_id);

      await db.from('user_profiles').update({
        plan_type: targetTier.id,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      const creditsDiff = targetTier.monthlyCredits - currentTier.monthlyCredits;
      if (creditsDiff > 0) {
        const referenceId = `upgrade_${subscription.stripe_subscription_id}_${targetTier.id}_${Date.now()}`;
        if (!(await idempotentCheck(referenceId))) {
          await addCredits(
            user.id,
            creditsDiff,
            'upgrade_credit',
            `升级补发 ${creditsDiff} 积分 (${currentTier.label} → ${targetTier.label})`,
            referenceId,
          );
        }
      }

      return Response.json({
        success: true,
        type: 'upgrade',
        creditsDiff,
        targetTier: targetTier.id,
        targetTierLabel: targetTier.label,
      });
    } else {
      await s.subscriptions.update(subscription.stripe_subscription_id, {
        items: [{ id: currentItem.id, price: targetTier.stripePriceId }],
        proration_behavior: 'none',
      });

      return Response.json({
        success: true,
        type: 'downgrade',
        effectiveDate: subscription.current_period_end,
        targetTier: targetTier.id,
        targetTierLabel: targetTier.label,
      });
    }
  } catch (error) {
    console.error('[stripe/upgrade/confirm]', error);
    return Response.json({ error: 'Plan change failed' }, { status: 500 });
  }
}
