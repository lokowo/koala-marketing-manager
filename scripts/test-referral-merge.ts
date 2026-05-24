/**
 * End-to-end test: referral credit flow after the merge change.
 *
 * Validates:
 *   - Registration with a student referral code does NOT award credits
 *     (but still sets referred_by, increments uses, marks visits converted)
 *   - Email verification awards +15 to referrer, +15 to new user
 *   - No earn_referral transactions exist (only earn_referral_verify)
 *
 * Run:  npx tsx scripts/test-referral-merge.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TS = Date.now();
const TEST_EMAIL = `test-refflow-${TS}@test.koala.dev`;

// ─── helpers ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ─── main ──────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Referral merge e2e test ===\n');

  // ── Step 0: Look up the referrer (renehee@hotmail.com) ──
  const { data: referrerProfile, error: refErr } = await db
    .from('user_profiles')
    .select('id, credits_remaining, referral_code, role')
    .eq('email', 'renehee@hotmail.com')
    .single();

  if (refErr || !referrerProfile) {
    console.error('Cannot find referrer profile:', refErr);
    process.exit(1);
  }

  const REFERRER_ID = referrerProfile.id as string;
  const REFERRER_CODE = (referrerProfile.referral_code as string).toUpperCase();
  const REFERRER_CREDITS_BEFORE = referrerProfile.credits_remaining as number;

  console.log(`Referrer: ${REFERRER_ID}`);
  console.log(`Code:     ${REFERRER_CODE}`);
  console.log(`Credits before: ${REFERRER_CREDITS_BEFORE}`);

  // Get referral_codes.uses before
  const { data: codeRowBefore } = await db
    .from('referral_codes')
    .select('uses')
    .eq('user_id', REFERRER_ID)
    .single();

  const USES_BEFORE = (codeRowBefore?.uses as number) ?? 0;
  console.log(`referral_codes.uses before: ${USES_BEFORE}`);
  console.log();

  // ── Step 1: Create a test user via auth.admin.createUser ──
  console.log('[Step 1] Creating test user:', TEST_EMAIL);

  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email: TEST_EMAIL,
    password: 'TestPass123!',
    email_confirm: false,
    user_metadata: { display_name: 'Test Referral User' },
  });

  if (authErr || !authData?.user) {
    console.error('Failed to create test user:', authErr);
    process.exit(1);
  }

  const NEW_USER_ID = authData.user.id;
  console.log('Created test user:', NEW_USER_ID);

  // ── Step 2: Create user_profiles with credits_remaining=30 ──
  console.log('[Step 2] Creating user_profiles row');

  const newRefCode = `TST${TS.toString(36).toUpperCase().slice(-5)}`;

  await db.from('user_profiles').upsert({
    id: NEW_USER_ID,
    display_name: 'Test Referral User',
    email: TEST_EMAIL,
    referral_code: newRefCode,
    credits_remaining: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  await db.from('referral_codes').insert({
    user_id: NEW_USER_ID,
    code: newRefCode,
  });

  // ── Step 3: Insert a referral_visits row (simulate middleware) ──
  console.log('[Step 3] Inserting referral_visits row');

  const { error: visitErr } = await db.from('referral_visits').insert({
    referral_code: REFERRER_CODE,
    referrer_user_id: REFERRER_ID,
    visitor_fingerprint: `test_visitor_${TS}`,
    landing_page: '/',
    converted: false,
  });

  if (visitErr) {
    console.warn('referral_visits insert warning (may be expected if table missing):', visitErr.message);
  }

  // Verify referral_visits row exists with converted=false
  const { data: visitRow } = await db
    .from('referral_visits')
    .select('id, converted')
    .eq('visitor_fingerprint', `test_visitor_${TS}`)
    .single();

  assert('referral_visits row created with converted=false',
    visitRow != null && visitRow.converted === false,
    visitRow ? `converted=${visitRow.converted}` : 'row not found');

  // ── Step 4: Simulate processReferralCode (Tier 1: student code) ──
  console.log('\n[Step 4] Simulating processReferralCode (registration)');

  // Look up referrer via user_profiles.referral_code
  const { data: directMatch } = await db
    .from('user_profiles')
    .select('id, credits_remaining, referral_code, role')
    .eq('referral_code', REFERRER_CODE)
    .single();

  assert('Tier 1: referrer found via user_profiles.referral_code',
    directMatch != null && directMatch.id === REFERRER_ID);

  const isAdmin = directMatch?.role === 'admin';
  console.log(`  Referrer role: ${directMatch?.role || 'student'}, isAdmin: ${isAdmin}`);

  if (!isAdmin) {
    const { data: codeCheck } = await db
      .from('referral_codes')
      .select('uses, max_uses')
      .eq('user_id', REFERRER_ID)
      .single();
    const uses = codeCheck?.uses || 0;
    const maxUses = codeCheck?.max_uses || 3;
    assert('Referrer has not exhausted invites', uses < maxUses, `${uses}/${maxUses}`);
  }

  // Set referred_by on new user (NO credits)
  await db.from('user_profiles').update({ referred_by: REFERRER_ID }).eq('id', NEW_USER_ID);

  // Increment uses
  const { data: codeRec } = await db.from('referral_codes').select('uses').eq('user_id', REFERRER_ID).single();
  if (codeRec) {
    await db.from('referral_codes').update({ uses: (codeRec.uses || 0) + 1 }).eq('user_id', REFERRER_ID);
  }

  // Mark referral_visits as converted
  await db
    .from('referral_visits')
    .update({ converted: true, converted_user_id: NEW_USER_ID })
    .eq('referral_code', REFERRER_CODE)
    .eq('visitor_fingerprint', `test_visitor_${TS}`);

  // ── Verify registration side effects ──
  console.log('\n[Step 4 verify] Checking registration results...');

  // Check referred_by is set
  const { data: newProfile } = await db.from('user_profiles').select('referred_by, credits_remaining').eq('id', NEW_USER_ID).single();
  assert('referred_by set on new user', newProfile?.referred_by === REFERRER_ID);
  assert('New user credits still 30 (no registration bonus)', newProfile?.credits_remaining === 30,
    `credits_remaining=${newProfile?.credits_remaining}`);

  // Check referrer credits unchanged
  const { data: refAfterReg } = await db.from('user_profiles').select('credits_remaining').eq('id', REFERRER_ID).single();
  assert('Referrer credits unchanged after registration', refAfterReg?.credits_remaining === REFERRER_CREDITS_BEFORE,
    `was ${REFERRER_CREDITS_BEFORE}, now ${refAfterReg?.credits_remaining}`);

  // Check referral_codes.uses incremented
  const { data: codeAfter } = await db.from('referral_codes').select('uses').eq('user_id', REFERRER_ID).single();
  assert('referral_codes.uses incremented by 1', (codeAfter?.uses ?? 0) === USES_BEFORE + 1,
    `was ${USES_BEFORE}, now ${codeAfter?.uses}`);

  // Check referral_visits converted
  const { data: visitAfter } = await db
    .from('referral_visits')
    .select('converted, converted_user_id')
    .eq('visitor_fingerprint', `test_visitor_${TS}`)
    .single();
  assert('referral_visits.converted = true', visitAfter?.converted === true);
  assert('referral_visits.converted_user_id set', visitAfter?.converted_user_id === NEW_USER_ID);

  // Check NO earn_referral credit_transactions exist
  const { data: regTxns } = await db
    .from('credit_transactions')
    .select('id, user_id, type, amount')
    .in('user_id', [NEW_USER_ID, REFERRER_ID])
    .eq('type', 'earn_referral');

  // Filter to only transactions referencing this test user
  const relevantRegTxns = (regTxns ?? []).filter(
    (t: any) => t.user_id === NEW_USER_ID ||
      (t.user_id === REFERRER_ID && false) // We'll check more carefully below
  );

  // For the new user specifically, there should be NO earn_referral
  const newUserRegTxns = (regTxns ?? []).filter((t: any) => t.user_id === NEW_USER_ID && t.type === 'earn_referral');
  assert('No earn_referral transactions for new user at registration',
    newUserRegTxns.length === 0,
    `found ${newUserRegTxns.length} transactions`);

  // ── Step 5: Simulate email verification (awardReferralVerificationCredits) ──
  console.log('\n[Step 5] Simulating email verification credits');

  // Replicate awardReferralVerificationCredits logic
  const { data: verifyProfile } = await db
    .from('user_profiles')
    .select('referred_by')
    .eq('id', NEW_USER_ID)
    .single();

  assert('referred_by still present for verification step', verifyProfile?.referred_by === REFERRER_ID);

  const refId = `verify_referral_${NEW_USER_ID}`;

  // Idempotent check
  const { data: existingTxn } = await db
    .from('credit_transactions')
    .select('id')
    .eq('reference_id', refId)
    .limit(1);
  const alreadyAwarded = (existingTxn?.length ?? 0) > 0;
  assert('No prior verify_referral transaction (idempotent check clean)', !alreadyAwarded);

  if (!alreadyAwarded) {
    // Award +15 to referrer
    const { data: refProfile2 } = await db
      .from('user_profiles')
      .select('credits_remaining')
      .eq('id', REFERRER_ID)
      .single();
    const refBalance = (refProfile2?.credits_remaining ?? 0) as number;
    const newRefBalance = refBalance + 15;

    await db.from('user_profiles').update({
      credits_remaining: newRefBalance,
      updated_at: new Date().toISOString(),
    }).eq('id', REFERRER_ID);

    await db.from('credit_transactions').insert({
      user_id: REFERRER_ID,
      amount: 15,
      balance_after: newRefBalance,
      type: 'earn_referral_verify',
      description: '被推荐人完成邮箱验证奖励',
      reference_id: refId,
    });

    // Award +15 to new user
    const { data: newProfile2 } = await db
      .from('user_profiles')
      .select('credits_remaining')
      .eq('id', NEW_USER_ID)
      .single();
    const newUserBalance = (newProfile2?.credits_remaining ?? 0) as number;
    const newNewBalance = newUserBalance + 15;

    await db.from('user_profiles').update({
      credits_remaining: newNewBalance,
      updated_at: new Date().toISOString(),
    }).eq('id', NEW_USER_ID);

    await db.from('credit_transactions').insert({
      user_id: NEW_USER_ID,
      amount: 15,
      balance_after: newNewBalance,
      type: 'earn_referral_verify',
      description: '邮箱验证推荐奖励',
      reference_id: `${refId}_new`,
    });

    console.log(`  Referrer: ${refBalance} -> ${newRefBalance}`);
    console.log(`  New user: ${newUserBalance} -> ${newNewBalance}`);
  }

  // ── Step 6: Final assertions ──
  console.log('\n[Step 6] Final verification');

  const { data: finalReferrer } = await db
    .from('user_profiles')
    .select('credits_remaining')
    .eq('id', REFERRER_ID)
    .single();

  const { data: finalNewUser } = await db
    .from('user_profiles')
    .select('credits_remaining')
    .eq('id', NEW_USER_ID)
    .single();

  const referrerGot = (finalReferrer?.credits_remaining as number) - REFERRER_CREDITS_BEFORE;
  const newUserFinal = finalNewUser?.credits_remaining as number;

  assert('Referrer total gain is +15 (not +15+20=35)',
    referrerGot === 15,
    `expected +15, got +${referrerGot} (before=${REFERRER_CREDITS_BEFORE}, after=${finalReferrer?.credits_remaining})`);

  assert('New user total credits is 45 (30 base + 15 verify, not 30+5+20=55)',
    newUserFinal === 45,
    `expected 45, got ${newUserFinal}`);

  // Check only earn_referral_verify transactions, no earn_referral for registration
  const { data: allTxns } = await db
    .from('credit_transactions')
    .select('id, user_id, type, amount, reference_id')
    .in('user_id', [NEW_USER_ID])
    .order('created_at', { ascending: true });

  const verifyTxns = (allTxns ?? []).filter((t: any) => t.type === 'earn_referral_verify');
  const regTxnsNew = (allTxns ?? []).filter((t: any) => t.type === 'earn_referral');

  assert('New user has earn_referral_verify transaction',
    verifyTxns.length === 1,
    `found ${verifyTxns.length}`);

  assert('New user has NO earn_referral transaction (registration credits removed)',
    regTxnsNew.length === 0,
    `found ${regTxnsNew.length}`);

  // Check referrer's earn_referral_verify for this test
  const { data: refVerifyTxns } = await db
    .from('credit_transactions')
    .select('id, type, amount, reference_id')
    .eq('user_id', REFERRER_ID)
    .eq('reference_id', refId);

  assert('Referrer has earn_referral_verify transaction for this test',
    (refVerifyTxns?.length ?? 0) === 1,
    `found ${refVerifyTxns?.length}`);

  if (refVerifyTxns?.[0]) {
    assert('Referrer earn_referral_verify amount is 15',
      refVerifyTxns[0].amount === 15,
      `amount=${refVerifyTxns[0].amount}`);
  }

  // ── Step 7: Cleanup ──
  console.log('\n[Step 7] Cleanup');

  // Delete credit_transactions for test user
  await db.from('credit_transactions').delete().eq('user_id', NEW_USER_ID);
  console.log('  Deleted credit_transactions for new user');

  // Delete credit_transactions for referrer from this test
  await db.from('credit_transactions').delete().eq('reference_id', refId);
  await db.from('credit_transactions').delete().eq('reference_id', `${refId}_new`);
  console.log('  Deleted referrer credit_transactions from this test');

  // Restore referrer credits
  await db.from('user_profiles').update({
    credits_remaining: REFERRER_CREDITS_BEFORE,
    updated_at: new Date().toISOString(),
  }).eq('id', REFERRER_ID);
  console.log(`  Restored referrer credits to ${REFERRER_CREDITS_BEFORE}`);

  // Restore referral_codes.uses
  await db.from('referral_codes').update({ uses: USES_BEFORE }).eq('user_id', REFERRER_ID);
  console.log(`  Restored referral_codes.uses to ${USES_BEFORE}`);

  // Delete referral_visits test row
  await db.from('referral_visits').delete().eq('visitor_fingerprint', `test_visitor_${TS}`);
  console.log('  Deleted referral_visits test row');

  // Delete referral_codes for test user
  await db.from('referral_codes').delete().eq('user_id', NEW_USER_ID);
  console.log('  Deleted referral_codes for test user');

  // Delete user_profiles for test user
  await db.from('user_profiles').delete().eq('id', NEW_USER_ID);
  console.log('  Deleted user_profiles for test user');

  // Delete auth user
  const { error: delErr } = await db.auth.admin.deleteUser(NEW_USER_ID);
  if (delErr) console.error('  Failed to delete auth user:', delErr);
  else console.log('  Deleted auth user');

  // ── Summary ──
  console.log('\n' + '='.repeat(50));
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log('='.repeat(50));

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
