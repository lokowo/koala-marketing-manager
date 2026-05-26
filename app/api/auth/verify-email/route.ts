import { supabaseAdmin } from '../../../lib/supabase/server';
import { sendWelcomeEmail } from '../../../lib/services/emailService';
import { addCredits, idempotentCheck } from '../../../lib/server/credits';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return Response.json({ error: 'email and code required' }, { status: 400 });
    }

    const { data: record, error: fetchErr } = await db
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('type', 'email_verify')
      .single();

    if (fetchErr || !record) {
      return Response.json({ error: '验证码不存在，请重新发送' }, { status: 400 });
    }

    if (record.verified) {
      return Response.json({ success: true, message: '邮箱已验证' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return Response.json({ error: '验证码已过期，请重新发送' }, { status: 400 });
    }

    if (record.code !== code) {
      return Response.json({ error: '验证码错误' }, { status: 400 });
    }

    // Mark as verified
    await db
      .from('email_verifications')
      .update({ verified: true })
      .eq('email', email)
      .eq('type', 'email_verify');

    // Update user profile email_verified flag if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    if (user) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      // Update user_profiles
      await db
        .from('user_profiles')
        .update({ email_verified: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      // Award referral credits on email verification
      await awardReferralVerificationCredits(user.id).catch(err => {
        console.error('[verify-email] referral credits:', err);
      });
    }

    // Send welcome email (async, don't block response)
    sendWelcomeEmail({ to: email, name: user?.user_metadata?.display_name }).catch(err => {
      console.error('[verify-email] welcome email:', err);
    });

    return Response.json({ success: true, message: '邮箱验证成功' });
  } catch (error) {
    console.error('[verify-email]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function awardReferralVerificationCredits(userId: string): Promise<void> {
  const { data: profile } = await db
    .from('user_profiles')
    .select('referred_by')
    .eq('id', userId)
    .single();

  if (!profile?.referred_by) return;

  const referrerId = profile.referred_by as string;
  const refId = `verify_referral_${userId}`;

  // Idempotent: don't double-award
  const alreadyAwarded = await idempotentCheck(refId);
  if (alreadyAwarded) return;

  // Anti-abuse: referrer total person cap — max 3 successful referrals
  const { data: totalReferrals } = await db
    .from('credit_transactions')
    .select('id')
    .eq('user_id', referrerId)
    .eq('type', 'earn_referral_verify');

  const totalReferralCount = totalReferrals?.length ?? 0;
  if (totalReferralCount >= 3) {
    console.log('[verify-email] referrer total cap reached:', referrerId, totalReferralCount, '>= 3');
    return;
  }

  // Anti-abuse: referrer monthly cap of 200 credits from referrals
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthlyTxns } = await db
    .from('credit_transactions')
    .select('amount')
    .eq('user_id', referrerId)
    .eq('type', 'earn_referral_verify')
    .gte('created_at', monthStart.toISOString());

  const monthlyTotal = (monthlyTxns ?? []).reduce(
    (sum: number, t: { amount: number }) => sum + (t.amount ?? 0), 0
  );

  if (monthlyTotal >= 200) {
    console.log('[verify-email] referrer monthly cap reached:', referrerId, monthlyTotal);
    return;
  }

  // Award +15 to referrer
  await addCredits(referrerId, 15, 'earn_referral_verify', '被推荐人完成邮箱验证奖励', refId);

  // Award +15 to new user
  await addCredits(userId, 15, 'earn_referral_verify', '邮箱验证推荐奖励', `${refId}_new`);

  console.log('[verify-email] referral credits awarded: referrer', referrerId, '+15, new user', userId, '+15');
}
