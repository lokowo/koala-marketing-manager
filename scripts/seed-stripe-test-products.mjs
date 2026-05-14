#!/usr/bin/env node
/**
 * Seed Stripe test products & prices for Koala PhD.
 * Usage: node scripts/seed-stripe-test-products.mjs
 *
 * Reads STRIPE_SECRET_KEY from .env.local.
 * REFUSES to run against a live key — test mode only.
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly (dotenv/config only reads .env)
config({ path: resolve(process.cwd(), '.env.local') });

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error('STRIPE_SECRET_KEY not set in .env.local');
}
if (!key.startsWith('sk_test_')) {
  throw new Error(
    `REFUSING: key prefix is "${key.slice(0, 8)}…", must be sk_test_ (test mode only!)`,
  );
}

const stripe = new Stripe(key);

// ─── Credit Packs (one-time payment) ─────────────────────────────────────────

const packs = [
  { name: '入门包 — 50 积分',   credits: 50,  amount: 499,  lookup: 'pack_starter_50' },
  { name: '标准包 — 120 积分',  credits: 120, amount: 999,  lookup: 'pack_standard_120' },
  { name: '专业包 — 280 积分',  credits: 280, amount: 1999, lookup: 'pack_pro_280' },
  { name: '旗舰包 — 800 积分',  credits: 800, amount: 4999, lookup: 'pack_flagship_800' },
];

// ─── Subscriptions (monthly recurring) ───────────────────────────────────────

const subs = [
  { name: 'Starter 月度订阅',  tier: 'starter', monthlyCredits: 10,  amount: 1990, lookup: 'sub_starter' },
  { name: 'Pro 月度订阅',      tier: 'pro',     monthlyCredits: 30,  amount: 4900, lookup: 'sub_pro' },
  { name: 'Elite 月度订阅',    tier: 'elite',   monthlyCredits: 100, amount: 9900, lookup: 'sub_elite' },
];

async function main() {
  console.log('🔑 Using Stripe TEST mode key\n');

  // ── Create credit pack products + prices ──────────────────────────────────

  console.log('━━━ Credit Packs (one-time) ━━━');
  const packResults = [];

  for (const pack of packs) {
    const product = await stripe.products.create({
      name: pack.name,
      metadata: {
        type: 'credit_pack',
        credits: String(pack.credits),
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.amount,
      currency: 'aud',
      metadata: {
        type: 'credit_pack',
        credits: String(pack.credits),
      },
      lookup_key: pack.lookup,
    });

    packResults.push({ name: pack.name, credits: pack.credits, priceId: price.id, lookup: pack.lookup });
    console.log(`  ✓ ${pack.name}: ${price.id}`);
  }

  // ── Create subscription products + prices ─────────────────────────────────

  console.log('\n━━━ Subscriptions (monthly) ━━━');
  const subResults = [];

  for (const sub of subs) {
    const product = await stripe.products.create({
      name: sub.name,
      metadata: {
        type: 'subscription',
        tier: sub.tier,
        monthly_credits: String(sub.monthlyCredits),
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: sub.amount,
      currency: 'aud',
      recurring: { interval: 'month' },
      metadata: {
        type: 'subscription',
        tier: sub.tier,
        monthly_credits: String(sub.monthlyCredits),
      },
      lookup_key: sub.lookup,
    });

    subResults.push({ name: sub.name, tier: sub.tier, priceId: price.id, lookup: sub.lookup });
    console.log(`  ✓ ${sub.name}: ${price.id}`);
  }

  // ── Output env vars ───────────────────────────────────────────────────────

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Add these to .env.local:\n');
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_CREDIT_STARTER=${packResults[0].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_CREDIT_STANDARD=${packResults[1].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_CREDIT_PRO=${packResults[2].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_CREDIT_FLAGSHIP=${packResults[3].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_SUB_STARTER=${subResults[0].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_SUB_PRO=${subResults[1].priceId}`);
  console.log(`NEXT_PUBLIC_STRIPE_PRICE_SUB_ELITE=${subResults[2].priceId}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nDone! 7 products created in Stripe test mode.');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
