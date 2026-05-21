#!/usr/bin/env npx tsx
/**
 * Clean up all test data created by seed-test-data.ts
 * Deletes agents with notes='TEST_DATA_DO_NOT_MODIFY' and all linked data.
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-data.ts           # interactive delete
 *   npx tsx scripts/cleanup-test-data.ts --dry-run  # print counts only
 */
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceKey) { console.error('Missing env vars'); process.exit(1); }
const db = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const TEST_MARKER = 'TEST_DATA_DO_NOT_MODIFY';
const EMAIL_DOMAIN = '@koalatest.com';
const DRY_RUN = process.argv.includes('--dry-run');

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

async function countTable(table: string, column: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { count } = await db.from(table).select('id', { count: 'exact', head: true }).in(column, ids);
  return count || 0;
}

async function main() {
  console.log(`=== Cleanup Test Data ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);
  console.log('Scanning...');

  const { data: testAgents } = await db.from('sales_agents').select('id, user_id, referral_code').eq('notes', TEST_MARKER);
  const agentIds = (testAgents || []).map(a => a.id);
  const agentUserIds = (testAgents || []).map(a => a.user_id);

  if (agentIds.length === 0) {
    console.log('No test agents found. Nothing to clean up.');
    return;
  }

  const commissionCount = await countTable('sales_commissions', 'agent_id', agentIds);
  const visitCount = await countTable('sales_visits', 'agent_id', agentIds);
  const referralCount = await countTable('sales_referrals', 'agent_id', agentIds);
  const kpiCount = await countTable('sales_kpi_targets', 'agent_id', agentIds);

  const { data: testCustomers } = await db.from('user_profiles').select('id').like('email', `%${EMAIL_DOMAIN}`).eq('role', 'user');
  const customerIds = (testCustomers || []).map(c => c.id);
  const allAuthIds = [...agentUserIds, ...customerIds];

  console.log(`\n--- Pre-delete counts ---`);
  console.log(`  Sales agents:     ${agentIds.length}`);
  console.log(`  Commissions:      ${commissionCount}`);
  console.log(`  Visits:           ${visitCount}`);
  console.log(`  Referrals:        ${referralCount}`);
  console.log(`  KPI targets:      ${kpiCount}`);
  console.log(`  Test customers:   ${customerIds.length}`);
  console.log(`  Auth users:       ${allAuthIds.length}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No data deleted.');
    return;
  }

  const ok = await confirm('\nProceed with deletion? (y/N) ');
  if (!ok) { console.log('Aborted.'); return; }

  // Delete in FK dependency order:
  // commissions → visits → referrals → kpi_targets → agents → user_profiles → auth users

  console.log('\n1/7 Deleting commissions...');
  {
    const { error } = await db.from('sales_commissions').delete().in('agent_id', agentIds);
    if (error) console.error('  ⚠', error.message);
    else console.log(`  ✓ ${commissionCount} commissions`);
  }

  console.log('2/7 Deleting visits...');
  {
    const { error } = await db.from('sales_visits').delete().in('agent_id', agentIds);
    if (error) console.error('  ⚠', error.message);
    else console.log(`  ✓ ${visitCount} visits`);
  }

  console.log('3/7 Deleting referrals...');
  {
    const { error } = await db.from('sales_referrals').delete().in('agent_id', agentIds);
    if (error) console.error('  ⚠', error.message);
    else console.log(`  ✓ ${referralCount} referrals`);
  }

  console.log('4/7 Deleting KPI targets...');
  {
    const { error } = await db.from('sales_kpi_targets').delete().in('agent_id', agentIds);
    if (error) console.error('  ⚠', error.message);
    else console.log(`  ✓ ${kpiCount} kpi targets`);
  }

  console.log('5/7 Deleting sales agents...');
  {
    const { error } = await db.from('sales_agents').delete().eq('notes', TEST_MARKER);
    if (error) console.error('  ⚠', error.message);
    else console.log(`  ✓ ${agentIds.length} agents`);
  }

  console.log('6/7 Deleting user profiles...');
  if (allAuthIds.length > 0) {
    const { error } = await db.from('user_profiles').delete().in('id', allAuthIds);
    if (error) console.error('  ⚠', error.message);
    else console.log(`  ✓ ${allAuthIds.length} profiles`);
  }

  console.log('7/7 Deleting auth users...');
  let authDeleted = 0;
  for (const uid of allAuthIds) {
    const { error } = await db.auth.admin.deleteUser(uid);
    if (error) console.error(`  ⚠ ${uid}:`, error.message);
    else authDeleted++;
    if (authDeleted % 20 === 0) process.stdout.write(`  Auth: ${authDeleted}/${allAuthIds.length}\r`);
  }
  console.log(`  ✓ ${authDeleted} auth users`);

  // Post-delete verification
  console.log('\n--- Post-delete verification ---');
  const postAgents = await countTable('sales_agents', 'notes' as any, [TEST_MARKER]);
  const { count: postCustomers } = await db.from('user_profiles').select('id', { count: 'exact', head: true }).like('email', `%${EMAIL_DOMAIN}`).eq('role', 'user');

  const residualAgents = postAgents;
  const residualCustomers = postCustomers || 0;

  console.log(`  Residual test agents:    ${residualAgents} ${residualAgents === 0 ? '✓' : '⚠ NOT CLEAN'}`);
  console.log(`  Residual test customers: ${residualCustomers} ${residualCustomers === 0 ? '✓' : '⚠ NOT CLEAN'}`);

  if (residualAgents === 0 && residualCustomers === 0) {
    console.log('\n=== Cleanup Complete ✓ ===');
  } else {
    console.log('\n=== Cleanup Incomplete ⚠ — check errors above ===');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
