import { getServerUser } from '../../../../lib/auth';
import { getStripe, getUserActiveSubscription } from '../../../../lib/server/stripe';
import { SUBSCRIPTION_TIERS, type SubscriptionTierId } from '../../../../lib/constants';

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
      const preview = await s.invoices.createPreview({
        customer: stripeSub.customer as string,
        subscription: subscription.stripe_subscription_id,
        subscription_details: {
          items: [{ id: currentItem.id, price: targetTier.stripePriceId }],
          proration_behavior: 'create_prorations',
        },
      });

      const proratedAmount = Math.max(0, (preview.amount_due || 0) / 100);

      return Response.json({
        type: 'upgrade',
        currentTier: currentTier.id,
        targetTier: targetTier.id,
        currentTierLabel: currentTier.label,
        targetTierLabel: targetTier.label,
        currentPrice: currentTier.price,
        proratedAmount: Math.round(proratedAmount * 100) / 100,
        newMonthlyPrice: targetTier.price,
        creditsDiff: targetTier.monthlyCredits - currentTier.monthlyCredits,
        effectiveNow: true,
      });
    } else {
      return Response.json({
        type: 'downgrade',
        currentTier: currentTier.id,
        targetTier: targetTier.id,
        currentTierLabel: currentTier.label,
        targetTierLabel: targetTier.label,
        currentPrice: currentTier.price,
        effectiveDate: subscription.current_period_end,
        newMonthlyPrice: targetTier.price,
        newMonthlyCredits: targetTier.monthlyCredits,
        effectiveNow: false,
      });
    }
  } catch (error) {
    console.error('[stripe/upgrade/preview]', error);
    return Response.json({ error: 'Preview failed' }, { status: 500 });
  }
}
