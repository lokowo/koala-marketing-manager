#!/usr/bin/env npx tsx
/**
 * Mark virtual/test data in sales_visits and sales_referrals with is_test=true.
 *
 * Detection criteria:
 *   sales_visits:
 *     - user_agent IS NULL AND ip_hash IS NULL (no real browser fingerprint)
 *     - OR visited_at < agent created_at (visit predates agent existence)
 *     - OR visitor_fingerprint starts with 'fp_test_'
 *     - OR source_url contains 'localhost' or 'example.com'
 *   sales_referrals:
 *     - referred email matches @koalatest.com domain
 *     - OR landing_page contains 'localhost' or 'preview'
 *
 * Usage:
 *   npx tsx scripts/mark-test-data.ts           # mark + report
 *   npx tsx scripts/mark-test-data.ts --dry-run  # report only
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceKey) { console.error('Missing env vars'); process.exit(1); }
const db = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`=== Mark Test Data ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  // ── 1. Get agent creation dates ──
  const { data: agents } = await db.from('sales_agents').select('id, display_name, email, created_at');
  if (!agents || agents.length === 0) {
    console.log('No agents found.');
    return;
  }
  console.log(`Found ${agents.length} agents.\n`);

  // ── 2. Scan visits ──
  const { data: allVisits } = await db
    .from('sales_visits')
    .select('id, agent_id, visited_at, user_agent, ip_hash, visitor_fingerprint, source_url, is_test');

  const visits = allVisits || [];
  const agentCreatedMap = Object.fromEntries(agents.map(a => [a.id, new Date(a.created_at)]));

  const suspiciousVisitIds: string[] = [];
  for (const v of visits) {
    if (v.is_test) continue;

    const noFingerprint = v.user_agent === null && v.ip_hash === null;
    const predatesAgent = agentCreatedMap[v.agent_id] && new Date(v.visited_at) < agentCreatedMap[v.agent_id];
    const testFp = v.visitor_fingerprint?.startsWith('fp_test_');
    const testUrl = v.source_url && (v.source_url.includes('localhost') || v.source_url.includes('example.com'));

    if (noFingerprint || predatesAgent || testFp || testUrl) {
      suspiciousVisitIds.push(v.id);
    }
  }

  // ── 3. Scan referrals ──
  const { data: allReferrals } = await db
    .from('sales_referrals')
    .select('id, agent_id, referred_user_id, landing_page, is_test, user_profiles:referred_user_id(email)');

  const referrals = allReferrals || [];
  const suspiciousReferralIds: string[] = [];
  for (const r of referrals) {
    if (r.is_test) continue;

    const profile = r.user_profiles as any;
    const isTestEmail = profile?.email?.includes('@koalatest.com');
    const isTestLanding = r.landing_page && (r.landing_page.includes('localhost') || r.landing_page.includes('/preview'));

    if (isTestEmail || isTestLanding) {
      suspiciousReferralIds.push(r.id);
    }
  }

  // ── 4. Report by agent ──
  console.log('--- Per-Agent Breakdown ---\n');

  for (const agent of agents) {
    const agentVisits = visits.filter(v => v.agent_id === agent.id);
    const alreadyMarked = agentVisits.filter(v => v.is_test).length;
    const newlyDetected = suspiciousVisitIds.filter(id => agentVisits.some(v => v.id === id)).length;
    const realVisits = agentVisits.length - alreadyMarked - newlyDetected;

    const agentRefs = referrals.filter(r => r.agent_id === agent.id);
    const alreadyMarkedRefs = agentRefs.filter(r => r.is_test).length;
    const newlyDetectedRefs = suspiciousReferralIds.filter(id => agentRefs.some(r => r.id === id)).length;
    const realRefs = agentRefs.length - alreadyMarkedRefs - newlyDetectedRefs;

    console.log(`  ${agent.display_name} (${agent.email})`);
    console.log(`    Visits:    ${agentVisits.length} total | ${alreadyMarked} already marked | ${newlyDetected} newly detected | ${realVisits} real`);
    console.log(`    Referrals: ${agentRefs.length} total | ${alreadyMarkedRefs} already marked | ${newlyDetectedRefs} newly detected | ${realRefs} real`);
    console.log('');
  }

  console.log('--- Summary ---');
  console.log(`  Visits to mark:    ${suspiciousVisitIds.length}`);
  console.log(`  Referrals to mark: ${suspiciousReferralIds.length}`);
  console.log(`  Already marked:    ${visits.filter(v => v.is_test).length} visits, ${referrals.filter(r => r.is_test).length} referrals`);
  console.log('');

  if (suspiciousVisitIds.length === 0 && suspiciousReferralIds.length === 0) {
    console.log('Nothing new to mark. ✓');
    return;
  }

  if (DRY_RUN) {
    console.log('[DRY RUN] No changes made.');
    return;
  }

  // ── 5. Mark visits ──
  if (suspiciousVisitIds.length > 0) {
    console.log(`Marking ${suspiciousVisitIds.length} visits as is_test=true...`);
    for (let i = 0; i < suspiciousVisitIds.length; i += 100) {
      const batch = suspiciousVisitIds.slice(i, i + 100);
      const { error } = await db.from('sales_visits').update({ is_test: true }).in('id', batch);
      if (error) console.error(`  ⚠ batch ${i}:`, error.message);
    }
    console.log(`  ✓ ${suspiciousVisitIds.length} visits marked`);
  }

  // ── 6. Mark referrals ──
  if (suspiciousReferralIds.length > 0) {
    console.log(`Marking ${suspiciousReferralIds.length} referrals as is_test=true...`);
    for (let i = 0; i < suspiciousReferralIds.length; i += 100) {
      const batch = suspiciousReferralIds.slice(i, i + 100);
      const { error } = await db.from('sales_referrals').update({ is_test: true }).in('id', batch);
      if (error) console.error(`  ⚠ batch ${i}:`, error.message);
    }
    console.log(`  ✓ ${suspiciousReferralIds.length} referrals marked`);
  }

  // ── 7. Post-mark verification ──
  console.log('\n--- Post-Mark Verification ---');
  const { count: markedVisits } = await db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('is_test', true);
  const { count: realVisitsCount } = await db.from('sales_visits').select('id', { count: 'exact', head: true }).eq('is_test', false);
  const { count: markedRefs } = await db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('is_test', true);
  const { count: realRefsCount } = await db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('is_test', false);

  console.log(`  sales_visits:    ${markedVisits} test | ${realVisitsCount} real`);
  console.log(`  sales_referrals: ${markedRefs} test | ${realRefsCount} real`);
  console.log('\n=== Done ✓ ===');
}

main().catch(e => { console.error(e); process.exit(1); });
