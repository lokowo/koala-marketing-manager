import Stripe from 'stripe';
import { getStripe, getSubscriptionTierByPriceId } from '../../../lib/server/stripe';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { addCredits, idempotentCheck } from '../../../lib/server/credits';
import { tryCreateCommission, handleRefund } from '../../../lib/server/commission';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return Response.json({ error: 'Missing stripe-signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch { return Response.json({ error: 'Invalid signature' }, { status: 400 }); }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session); break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice); break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription); break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription); break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, event.id); break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice); break;
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error('[webhook]', event.type, error);
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function resolveUserId(customerId: string, metadata?: Stripe.Metadata | null): Promise<string | null> {
  if (metadata?.supabase_user_id) return metadata.supabase_user_id;
  const { data } = await db.from('user_profiles').select('id').eq('stripe_customer_id', customerId).single();
  return data?.id || null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = await resolveUserId(session.customer as string, session.metadata);
  if (!userId) { console.error('[webhook] Could not resolve user for customer', session.customer); return; }
  if (session.mode === 'payment') await handleCreditPackPurchase(session, userId);
  else if (session.mode === 'subscription') await handleNewSubscription(session, userId);
}

async function handleCreditPackPurchase(session: Stripe.Checkout.Session, userId: string) {
  const referenceId = `checkout_${session.id}`;
  if (await idempotentCheck(referenceId)) return;
  const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 1 });
  const priceId = lineItems.data[0]?.price?.id;
  if (!priceId) return;
  const creditsMetadata = lineItems.data[0]?.price?.metadata?.credits;
  let credits = creditsMetadata ? parseInt(creditsMetadata, 10) : 0;
  if (!credits) {
    const { CREDIT_PACKAGES } = await import('../../../lib/constants');
    const pack = CREDIT_PACKAGES.find(p => p.stripePriceId === priceId);
    credits = pack?.credits ?? 0;
  }
  if (!credits) return;
  await addCredits(userId, credits, 'purchase', `积分充值 ${credits} 积分`, referenceId);
  const { CREDIT_PACKAGES } = await import('../../../lib/constants');
  const pack = CREDIT_PACKAGES.find(p => p.stripePriceId === priceId);
  if (pack) {
    await tryCreateCommission({
      userId, stripePaymentId: (session.payment_intent as string) || `checkout_${session.id}`,
      stripeCheckoutSessionId: session.id, productType: pack.id,
      productName: `${pack.label} — ${pack.credits} 积分`, paymentAmount: pack.priceAUD,
    });
  }
}

async function handleNewSubscription(session: Stripe.Checkout.Session, userId: string) {
  const subscriptionId = session.subscription as string;
  const referenceId = `sub_start_${subscriptionId}`;
  if (await idempotentCheck(referenceId)) return;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return;
  const tier = getSubscriptionTierByPriceId(priceId);
  if (!tier) return;
  await db.from('subscriptions').upsert({
    user_id: userId, stripe_subscription_id: subscriptionId,
    stripe_customer_id: session.customer as string, tier: tier.id, status: 'active',
    current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end, updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });
  await db.from('user_profiles').update({ plan_type: tier.id, updated_at: new Date().toISOString() }).eq('id', userId);
  await addCredits(userId, tier.monthlyCredits, 'subscription_credit', `${tier.label} 订阅首月 ${tier.monthlyCredits} 积分`, referenceId);
  await tryCreateCommission({
    userId, stripePaymentId: (session.payment_intent as string) || `sub_${subscriptionId}`,
    stripeCheckoutSessionId: session.id, productType: `sub_${tier.id}`,
    productName: `${tier.label} 月度订阅`, paymentAmount: tier.price,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== 'subscription_cycle') return;
  const referenceId = `invoice_${invoice.id}`;
  if (await idempotentCheck(referenceId)) return;
  const subscriptionId = (invoice as unknown as { subscription: string }).subscription;
  const { data: sub } = await db.from('subscriptions').select('user_id, tier').eq('stripe_subscription_id', subscriptionId).single();
  if (!sub) return;
  const { SUBSCRIPTION_TIERS } = await import('../../../lib/constants');
  const tier = SUBSCRIPTION_TIERS[sub.tier as keyof typeof SUBSCRIPTION_TIERS];
  if (!tier) return;
  const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId);
  await db.from('subscriptions').update({
    current_period_start: new Date(stripeSub.items.data[0].current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSub.items.data[0].current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', subscriptionId);
  await addCredits(sub.user_id, tier.monthlyCredits, 'subscription_credit', `${tier.label} 月度续付 ${tier.monthlyCredits} 积分`, referenceId);
  const invTotal = (invoice.amount_paid || 0) / 100;
  await tryCreateCommission({
    userId: sub.user_id, stripePaymentId: ((invoice as any).payment_intent as string) || `invoice_${invoice.id}`,
    stripeInvoiceId: invoice.id, productType: `sub_${tier.id}`,
    productName: `${tier.label} 月度续费`, paymentAmount: invTotal > 0 ? invTotal : tier.price,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) return;
  const tier = getSubscriptionTierByPriceId(priceId);
  const newTierId = tier?.id || null;
  const statusMap: Record<string, string> = {
    active: 'active', past_due: 'past_due', canceled: 'canceled', incomplete: 'incomplete',
    incomplete_expired: 'canceled', trialing: 'active', unpaid: 'past_due', paused: 'canceled',
  };
  const mappedStatus = statusMap[subscription.status] || 'active';
  await db.from('subscriptions').update({
    tier: newTierId || undefined, status: mappedStatus,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', subscription.id);
  if (newTierId) {
    const { data: sub } = await db.from('subscriptions').select('user_id').eq('stripe_subscription_id', subscription.id).single();
    if (sub) await db.from('user_profiles').update({ plan_type: mappedStatus === 'active' ? newTierId : 'free', updated_at: new Date().toISOString() }).eq('id', sub.user_id);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.from('subscriptions').update({ status: 'canceled', cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq('stripe_subscription_id', subscription.id);
  const { data: sub } = await db.from('subscriptions').select('user_id').eq('stripe_subscription_id', subscription.id).single();
  if (sub) {
    await db.from('user_profiles').update({ plan_type: 'free', updated_at: new Date().toISOString() }).eq('id', sub.user_id);
    await db.from('sales_audit_logs').insert({
      actor_id: sub.user_id, actor_email: '', actor_role: 'system',
      action: 'subscription_cancelled', target_type: 'referral',
      details: { stripe_subscription_id: subscription.id },
    });
  }
}

async function handleChargeRefunded(charge: Stripe.Charge, eventId: string) {
  const pid = charge.payment_intent as string;
  if (!pid) return;
  await handleRefund({ stripePaymentId: pid, refundAmount: (charge.amount_refunded || 0) / 100, refundEventId: eventId });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.warn('[webhook] invoice.payment_failed:', invoice.id);
  const sid = (invoice as unknown as { subscription: string }).subscription;
  if (!sid) return;
  const { data: sub } = await db.from('subscriptions').select('user_id').eq('stripe_subscription_id', sid).maybeSingle();
  if (sub) {
    await db.from('sales_audit_logs').insert({
      actor_id: sub.user_id, actor_email: '', actor_role: 'system',
      action: 'payment_failed', target_type: 'commission',
      details: { invoice_id: invoice.id, subscription_id: sid },
    });
  }
}
