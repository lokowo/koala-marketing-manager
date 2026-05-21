#!/usr/bin/env npx tsx
/**
 * Seed test data for stress-testing admin & sales dashboards.
 * Creates 10 sales agents, 100 customers, visits, referrals, commissions.
 *
 * Usage: npx tsx scripts/seed-test-data.ts
 * Cleanup: npx tsx scripts/cleanup-test-data.ts
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceKey) { console.error('Missing env vars'); process.exit(1); }
const db = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const TEST_MARKER = 'TEST_DATA_DO_NOT_MODIFY';
const EMAIL_DOMAIN = '@koalatest.com';
const AGENT_COUNT = 10;
const CUSTOMERS_PER_AGENT = 10;

const TIERS: string[] = [
  'standard','standard','standard','standard','standard','standard',
  'senior','senior','senior',
  'partner',
];

const PRODUCTS = [
  { type: 'credit_starter',  name: '入门包',      price: 4.99 },
  { type: 'credit_standard', name: '标准包',      price: 9.99 },
  { type: 'credit_standard', name: '标准包',      price: 19.99 },
  { type: 'credit_pro',     name: '专业包',      price: 29.99 },
  { type: 'credit_flagship', name: '旗舰包',      price: 49.99 },
  { type: 'sub_starter',    name: 'Starter订阅', price: 19.90 },
  { type: 'sub_pro',        name: 'Pro订阅',     price: 49.00 },
  { type: 'sub_elite',      name: 'Elite订阅',   price: 99.00 },
];

const CHANNELS = ['qr_code', 'wechat_share', 'xiaohongshu', 'direct_link', 'offline'];
const LANDING_PAGES = ['/koala/home', '/koala/pricing', '/koala/professors', '/koala/chat', '/s/TEST001'];

const TIER_RATES: Record<string, Record<string, number>> = {
  credit_starter:  { standard: 0.15, senior: 0.18, partner: 0.20 },
  credit_standard: { standard: 0.18, senior: 0.21, partner: 0.24 },
  credit_pro:      { standard: 0.20, senior: 0.23, partner: 0.26 },
  credit_flagship: { standard: 0.20, senior: 0.23, partner: 0.26 },
  sub_starter:     { standard: 0.20, senior: 0.23, partner: 0.26 },
  sub_pro:         { standard: 0.22, senior: 0.25, partner: 0.28 },
  sub_elite:       { standard: 0.25, senior: 0.28, partner: 0.32 },
};

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysBack));
  d.setHours(rand(8, 22), rand(0, 59), rand(0, 59));
  return d.toISOString();
}
function pad(n: number, len: number) { return String(n).padStart(len, '0'); }

async function main() {
  console.log('=== Seed Test Data ===\n');

  // Check for existing test data
  const { count: existingCount } = await db.from('sales_agents').select('id', { count: 'exact', head: true }).eq('notes', TEST_MARKER);
  if (existingCount && existingCount > 0) {
    console.error(`⚠️  Already have ${existingCount} test agents. Run cleanup-test-data.ts first.`);
    process.exit(1);
  }

  // ── 1. Create auth users (10 agents + 100 customers) ──
  console.log('Creating auth users...');
  const agentAuthIds: string[] = [];
  const customerAuthIds: string[] = [];

  for (let i = 1; i <= AGENT_COUNT; i++) {
    const email = `testsales${pad(i, 2)}${EMAIL_DOMAIN}`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { display_name: `测试销售${pad(i, 2)}` },
    });
    if (error) { console.error(`  Agent ${i}:`, error.message); process.exit(1); }
    agentAuthIds.push(data.user.id);
    process.stdout.write(`  Agent ${i}/10\r`);
  }
  console.log(`  ✓ ${AGENT_COUNT} agent auth users`);

  for (let i = 1; i <= AGENT_COUNT * CUSTOMERS_PER_AGENT; i++) {
    const email = `testcustomer${pad(i, 3)}${EMAIL_DOMAIN}`;
    const createdAt = randomDate(90);
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { display_name: `测试客户${pad(i, 3)}`, created_at: createdAt },
    });
    if (error) { console.error(`  Customer ${i}:`, error.message); process.exit(1); }
    customerAuthIds.push(data.user.id);
    if (i % 10 === 0) process.stdout.write(`  Customer ${i}/100\r`);
  }
  console.log(`  ✓ ${AGENT_COUNT * CUSTOMERS_PER_AGENT} customer auth users`);

  // ── 2. Create user_profiles ──
  console.log('Creating user profiles...');
  const agentProfiles = agentAuthIds.map((id, i) => ({
    id,
    display_name: `测试销售${pad(i + 1, 2)}`,
    email: `testsales${pad(i + 1, 2)}${EMAIL_DOMAIN}`,
    role: 'sales',
    credit_balance: 0,
    created_at: randomDate(90),
  }));

  const customerProfiles = customerAuthIds.map((id, i) => ({
    id,
    display_name: `测试客户${pad(i + 1, 3)}`,
    email: `testcustomer${pad(i + 1, 3)}${EMAIL_DOMAIN}`,
    role: 'user',
    credit_balance: rand(0, 200),
    created_at: randomDate(90),
  }));

  const { error: apErr } = await db.from('user_profiles').upsert(agentProfiles, { onConflict: 'id' });
  if (apErr) { console.error('Agent profiles:', apErr.message); process.exit(1); }
  const { error: cpErr } = await db.from('user_profiles').upsert(customerProfiles, { onConflict: 'id' });
  if (cpErr) { console.error('Customer profiles:', cpErr.message); process.exit(1); }
  console.log(`  ✓ ${agentProfiles.length + customerProfiles.length} user profiles`);

  // ── 3. Create sales_agents ──
  console.log('Creating sales agents...');
  const agentRecords = agentAuthIds.map((uid, i) => ({
    user_id: uid,
    name: `测试销售${pad(i + 1, 2)}`,
    display_name: `测试销售${pad(i + 1, 2)}`,
    email: `testsales${pad(i + 1, 2)}${EMAIL_DOMAIN}`,
    phone: `+6140000${pad(i + 1, 4)}`,
    wechat_id: `testwechat${pad(i + 1, 2)}`,
    referral_code: `TEST${pad(i + 1, 3)}`,
    status: 'active',
    tier: TIERS[i],
    payment_method: pick(['bank_transfer', 'wechat', 'alipay']),
    payment_account: `test_account_${pad(i + 1, 2)}`,
    payment_name: `测试销售${pad(i + 1, 2)}`,
    notes: TEST_MARKER,
  }));

  const { data: agents, error: agErr } = await db.from('sales_agents').insert(agentRecords).select('id, user_id, tier, referral_code');
  if (agErr) { console.error('Sales agents:', agErr.message); process.exit(1); }
  console.log(`  ✓ ${agents!.length} sales agents`);

  // ── 4. Create sales_visits ──
  console.log('Creating sales visits...');
  const visitRows: any[] = [];
  for (const agent of agents!) {
    const count = rand(50, 200);
    for (let v = 0; v < count; v++) {
      const visitedAt = randomDate(90);
      const hourBucket = new Date(visitedAt);
      hourBucket.setMinutes(0, 0, 0);
      visitRows.push({
        agent_id: agent.id,
        channel: pick(CHANNELS),
        landing_page: pick(LANDING_PAGES),
        source_url: `https://example.com/ref/${agent.referral_code}`,
        visitor_fingerprint: `fp_test_${agent.referral_code}_${v}`,
        hour_bucket: hourBucket.toISOString(),
        visited_at: visitedAt,
        ip_hash: `hash_${rand(1000, 9999)}`,
      });
    }
  }
  // Insert in batches of 500
  for (let b = 0; b < visitRows.length; b += 500) {
    const batch = visitRows.slice(b, b + 500);
    const { error } = await db.from('sales_visits').insert(batch);
    if (error) { console.error(`Visits batch ${b}:`, error.message); process.exit(1); }
    process.stdout.write(`  Visits: ${Math.min(b + 500, visitRows.length)}/${visitRows.length}\r`);
  }
  console.log(`  ✓ ${visitRows.length} visits`);

  // ── 5. Create sales_referrals ──
  console.log('Creating sales referrals...');
  const referralRows = customerAuthIds.map((custId, i) => {
    const agentIdx = Math.floor(i / CUSTOMERS_PER_AGENT);
    const agent = agents![agentIdx];
    const regAt = randomDate(90);
    return {
      agent_id: agent.id,
      referred_user_id: custId,
      channel: pick(CHANNELS),
      landing_page: pick(LANDING_PAGES),
      source_url: `https://koalaphd.com/r/${agent.referral_code}`,
      registered_at: regAt,
      total_revenue: 0,
      total_commission: 0,
      total_refunded: 0,
      offline_converted: rand(1, 10) <= 2,
      offline_converted_at: rand(1, 10) <= 2 ? randomDate(60) : null,
    };
  });

  const { data: referrals, error: refErr } = await db.from('sales_referrals').insert(referralRows).select('id, agent_id, referred_user_id');
  if (refErr) { console.error('Referrals:', refErr.message); process.exit(1); }
  console.log(`  ✓ ${referrals!.length} referrals`);

  // ── 6. Create sales_commissions ──
  console.log('Creating sales commissions...');
  const commissionRows: any[] = [];
  const referralRevenueMap: Record<string, { revenue: number; commission: number }> = {};

  // ~150 commissions: ~60% of customers have at least 1, some have 2
  const customersWithCommissions = referrals!.filter(() => rand(1, 100) <= 60);
  const extraCommissions = referrals!.filter(() => rand(1, 100) <= 30);
  const allCommissionRefs = [...customersWithCommissions, ...extraCommissions];

  for (const ref of allCommissionRefs) {
    const agent = agents!.find(a => a.id === ref.agent_id)!;
    const product = pick(PRODUCTS);
    const rate = TIER_RATES[product.type]?.[agent.tier] ?? 0.20;
    const commAmount = Math.round(product.price * rate * 100) / 100;
    const createdAt = randomDate(90);

    const roll = rand(1, 100);
    let status: string;
    let confirmedAt: string | null = null;
    let paidOutAt: string | null = null;
    if (roll <= 60) {
      status = 'confirmed';
      confirmedAt = createdAt;
    } else if (roll <= 85) {
      status = 'pending';
    } else {
      status = 'paid_out';
      confirmedAt = createdAt;
      paidOutAt = randomDate(30);
    }

    commissionRows.push({
      agent_id: ref.agent_id,
      referral_id: ref.id,
      referred_user_id: ref.referred_user_id,
      stripe_payment_id: `pi_test_${rand(100000, 999999)}`,
      product_type: product.type,
      product_name: product.name,
      payment_amount: product.price,
      commission_rate: rate,
      commission_amount: commAmount,
      status,
      confirmed_at: confirmedAt,
      confirmation_method: confirmedAt ? pick(['auto_t30', 'manual_admin']) : null,
      paid_out_at: paidOutAt,
      payout_method: paidOutAt ? pick(['bank_transfer', 'wechat', 'alipay']) : null,
      payout_reference: paidOutAt ? `TXN${rand(100000, 999999)}` : null,
      created_at: createdAt,
    });

    // Track referral totals
    if (!referralRevenueMap[ref.id]) referralRevenueMap[ref.id] = { revenue: 0, commission: 0 };
    referralRevenueMap[ref.id].revenue += product.price;
    referralRevenueMap[ref.id].commission += commAmount;
  }

  for (let b = 0; b < commissionRows.length; b += 100) {
    const batch = commissionRows.slice(b, b + 100);
    const { error } = await db.from('sales_commissions').insert(batch);
    if (error) { console.error(`Commissions batch ${b}:`, error.message); process.exit(1); }
  }
  console.log(`  ✓ ${commissionRows.length} commissions`);

  // ── 7. Update referral totals ──
  console.log('Updating referral revenue totals...');
  let updated = 0;
  for (const [refId, totals] of Object.entries(referralRevenueMap)) {
    await db.from('sales_referrals').update({
      total_revenue: Math.round(totals.revenue * 100) / 100,
      total_commission: Math.round(totals.commission * 100) / 100,
      first_purchase_at: randomDate(60),
    }).eq('id', refId);
    updated++;
  }
  console.log(`  ✓ ${updated} referral totals updated`);

  // ── Summary ──
  console.log('\n=== Seed Complete ===');
  console.log(`  Auth users:    ${AGENT_COUNT + AGENT_COUNT * CUSTOMERS_PER_AGENT}`);
  console.log(`  User profiles: ${agentProfiles.length + customerProfiles.length}`);
  console.log(`  Sales agents:  ${agents!.length}`);
  console.log(`  Visits:        ${visitRows.length}`);
  console.log(`  Referrals:     ${referrals!.length}`);
  console.log(`  Commissions:   ${commissionRows.length}`);
  console.log(`\nTier distribution: Standard=${TIERS.filter(t=>t==='standard').length} Senior=${TIERS.filter(t=>t==='senior').length} Partner=${TIERS.filter(t=>t==='partner').length}`);
  console.log(`Commission status: confirmed=${commissionRows.filter(c=>c.status==='confirmed').length} pending=${commissionRows.filter(c=>c.status==='pending').length} paid_out=${commissionRows.filter(c=>c.status==='paid_out').length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
