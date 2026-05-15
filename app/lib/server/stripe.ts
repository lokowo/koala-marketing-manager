import Stripe from 'stripe';
import { supabaseAdmin } from '../supabase/server';
import { CREDIT_PACKAGES, SUBSCRIPTION_TIERS } from '../constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-04-22.dahlia',
    });
  }
  return _stripe;
}

const VALID_PRICE_IDS = new Set([
  ...CREDIT_PACKAGES.map(p => p.stripePriceId),
  ...Object.values(SUBSCRIPTION_TIERS).map(t => t.stripePriceId),
].filter(Boolean));

export function isValidPriceId(priceId: string): boolean {
  return VALID_PRICE_IDS.has(priceId);
}

export function isCreditPackPrice(priceId: string): boolean {
  return CREDIT_PACKAGES.some(p => p.stripePriceId === priceId);
}

export function isSubscriptionPrice(priceId: string): boolean {
  return Object.values(SUBSCRIPTION_TIERS).some(t => t.stripePriceId === priceId);
}

export function getCreditPackByPriceId(priceId: string) {
  return CREDIT_PACKAGES.find(p => p.stripePriceId === priceId);
}

export function getSubscriptionTierByPriceId(priceId: string) {
  return Object.values(SUBSCRIPTION_TIERS).find(t => t.stripePriceId === priceId);
}

export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const s = getStripe();
  const { data: profile } = await db
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    try {
      const existing = await s.customers.retrieve(profile.stripe_customer_id);
      if (!existing.deleted) return profile.stripe_customer_id;
    } catch {
      // Stale or cross-mode customer ID — clear it and create fresh
    }
  }

  const customer = await s.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await db
    .from('user_profiles')
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return customer.id;
}

export async function getUserActiveSubscription(userId: string) {
  const { data } = await db
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}
