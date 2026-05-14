import { supabaseAdmin } from '../../../lib/supabase/server';
import { sendVerificationEmail } from '../../../lib/services/emailService';
import { notifyNewUserSignup } from '../../../lib/server/slack';

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

async function processReferralCode(
  code: string,
  newUserId: string,
  newUserEmail: string,
): Promise<boolean> {
  const upperCode = code.toUpperCase();
  console.log('[referral] processing code:', upperCode, 'for user:', newUserId);

  // Verify new user's profile exists before proceeding
  const { data: newUserProfile, error: profileCheckErr } = await db
    .from('user_profiles')
    .select('id, credits_remaining')
    .eq('id', newUserId)
    .single();

  if (!newUserProfile) {
    console.error('[referral] new user profile not found, cannot process referral', { newUserId, error: profileCheckErr });
    return false;
  }
  console.log('[referral] new user profile confirmed, credits:', newUserProfile.credits_remaining);

  // --- Tier 1: Match user_profiles.referral_code (normal user or admin) ---
  let referrerProfile: { id: string; credits_remaining: number; referral_code: string; role?: string } | null = null;

  const { data: directMatch } = await db
    .from('user_profiles')
    .select('id, credits_remaining, referral_code, role')
    .eq('referral_code', upperCode)
    .single();

  if (directMatch) {
    referrerProfile = directMatch;
    console.log('[referral] tier1: matched via user_profiles.referral_code, referrer:', directMatch.id, 'role:', directMatch.role);
  } else {
    const { data: codeRow } = await db
      .from('referral_codes')
      .select('user_id')
      .eq('code', upperCode)
      .single();
    if (codeRow) {
      const { data: fallbackProfile } = await db
        .from('user_profiles')
        .select('id, credits_remaining, referral_code, role')
        .eq('id', codeRow.user_id)
        .single();
      if (fallbackProfile) {
        await db.from('user_profiles').update({ referral_code: upperCode }).eq('id', fallbackProfile.id);
        referrerProfile = fallbackProfile;
        console.log('[referral] tier1: matched via referral_codes table, referrer:', fallbackProfile.id);
      }
    }
  }

  if (referrerProfile && referrerProfile.id !== newUserId) {
    const isAdmin = referrerProfile.role === 'admin';

    if (!isAdmin) {
      const { data: codeRecord } = await db
        .from('referral_codes')
        .select('uses, max_uses')
        .eq('user_id', referrerProfile.id)
        .single();
      const uses = codeRecord?.uses || 0;
      const maxUses = codeRecord?.max_uses || 3;
      if (uses >= maxUses) {
        console.log('[referral] referrer exhausted invites:', uses, '/', maxUses);
        return false;
      }
      console.log('[referral] referrer invite count:', uses, '/', maxUses);
    } else {
      console.log('[referral] referrer is admin, skipping max_uses check');
    }

    // Award credits to referrer (+15)
    const newReferrerBalance = (referrerProfile.credits_remaining || 0) + 15;
    const { error: refUpdateErr } = await db.from('user_profiles').update({ credits_remaining: newReferrerBalance }).eq('id', referrerProfile.id);
    if (refUpdateErr) console.error('[referral] failed to update referrer credits:', refUpdateErr);
    await db.from('credit_transactions').insert({
      user_id: referrerProfile.id,
      amount: 15,
      balance_after: newReferrerBalance,
      type: 'earn_referral',
      description: `邀请好友注册（${newUserEmail.split('@')[0]})`,
      reference_id: newUserId,
    });
    console.log('[referral] referrer +15 credits, new balance:', newReferrerBalance);

    // Award credits to new user (+5)
    const { data: freshProfile } = await db.from('user_profiles').select('credits_remaining').eq('id', newUserId).single();
    const currentBalance = freshProfile?.credits_remaining ?? newUserProfile.credits_remaining ?? 0;
    const newMyBalance = currentBalance + 5;
    const { error: newUserUpdateErr } = await db.from('user_profiles').update({ credits_remaining: newMyBalance, referred_by: referrerProfile.id }).eq('id', newUserId);
    if (newUserUpdateErr) console.error('[referral] failed to update new user credits:', newUserUpdateErr);
    await db.from('credit_transactions').insert({
      user_id: newUserId,
      amount: 5,
      balance_after: newMyBalance,
      type: 'earn_referral',
      description: '使用邀请码注册奖励',
      reference_id: referrerProfile.id,
    });
    console.log('[referral] new user +5 credits, new balance:', newMyBalance);

    // Increment uses count
    const { data: codeRecord } = await db.from('referral_codes').select('uses').eq('user_id', referrerProfile.id).single();
    if (codeRecord) {
      await db.from('referral_codes').update({ uses: (codeRecord.uses || 0) + 1 }).eq('user_id', referrerProfile.id);
      console.log('[referral] incremented referral_codes.uses to:', (codeRecord.uses || 0) + 1);
    }

    console.log('[referral] tier1 complete: referrer', referrerProfile.id, '→ new user', newUserId);
    return true;
  }

  if (referrerProfile?.id === newUserId) {
    console.log('[referral] self-referral blocked');
    return false;
  }

  // --- Tier 2: Match sales_qrcodes.code (sales channel) ---
  try {
    const { data: salesQr } = await db
      .from('sales_qrcodes')
      .select('id, sales_user_id')
      .eq('code', upperCode)
      .single();

    if (salesQr) {
      console.log('[referral] tier2: matched sales_qrcodes, sales_user:', salesQr.sales_user_id);

      await db.from('sales_customers').insert({
        sales_user_id: salesQr.sales_user_id,
        customer_user_id: newUserId,
        qrcode_id: salesQr.id,
        source: 'referral_code',
        stage: 'registered',
      }).then(() => {}).catch((e: unknown) => console.error('[referral] sales_customers insert failed:', e));

      const { data: qr } = await db.from('sales_qrcodes').select('register_count').eq('id', salesQr.id).single();
      if (qr) {
        await db.from('sales_qrcodes').update({ register_count: (qr.register_count || 0) + 1 }).eq('id', salesQr.id);
      }

      // Award new user +5 credits
      const { data: freshProfile } = await db.from('user_profiles').select('credits_remaining').eq('id', newUserId).single();
      const currentBalance = freshProfile?.credits_remaining ?? newUserProfile.credits_remaining ?? 0;
      const newBalance = currentBalance + 5;
      await db.from('user_profiles').update({ credits_remaining: newBalance }).eq('id', newUserId);
      await db.from('credit_transactions').insert({
        user_id: newUserId,
        amount: 5,
        balance_after: newBalance,
        type: 'earn_referral',
        description: 'Sales 渠道注册奖励',
      });
      console.log('[referral] tier2 complete: sales credit +5, new balance:', newBalance);
      return true;
    }
  } catch (e) {
    console.error('[referral] tier2 sales lookup failed:', e);
  }

  console.log('[referral] no match found for code:', upperCode);
  return false;
}

export async function POST(req: Request) {
  try {
    const { email, password, name, referralCode, salesCode, dataConsent } = await req.json();
    if (!email || !password) {
      return Response.json({ error: 'email and password required' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: '密码至少8位' }, { status: 400 });
    }

    // Create user via admin API — does NOT send Supabase's confirmation email
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { display_name: name || email.split('@')[0], data_consent: !!dataConsent, data_consent_at: dataConsent ? new Date().toISOString() : undefined },
    });

    if (createErr) {
      if (createErr.message?.includes('already been registered') || createErr.message?.includes('already exists')) {
        return Response.json({ error: '该邮箱已注册，请直接登录' }, { status: 409 });
      }
      console.error('[register] create user:', createErr);
      return Response.json({ error: createErr.message }, { status: 400 });
    }

    // Generate referral code for the new user
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let refCode = '';
    for (let i = 0; i < 6; i++) refCode += chars[Math.floor(Math.random() * chars.length)];

    // Create user_profiles record — must succeed before referral processing
    const { error: profileErr } = await db.from('user_profiles').upsert({
      id: userData.user.id,
      display_name: name || email.split('@')[0],
      email,
      referral_code: refCode,
      credits_remaining: 30,
      data_consent: !!dataConsent,
      data_consent_at: dataConsent ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileErr) {
      console.error('[register] user_profiles upsert failed, retrying:', profileErr);
      const { error: retryErr } = await db.from('user_profiles').upsert({
        id: userData.user.id,
        display_name: name || email.split('@')[0],
        email,
        referral_code: refCode,
        credits_remaining: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (retryErr) {
        console.error('[register] user_profiles upsert retry also failed:', retryErr);
      }
    }

    await db.from('referral_codes').insert({ user_id: userData.user.id, code: refCode }).then(() => {}).catch((e: unknown) => {
      console.error('[register] referral_codes insert failed:', e);
    });

    // Store referral and sales codes in user metadata
    if (referralCode || salesCode) {
      const meta: Record<string, string> = {};
      if (referralCode) meta.referral_code = referralCode;
      if (salesCode) meta.sales_code = salesCode;
      await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
        user_metadata: { ...userData.user.user_metadata, ...meta },
      });
    }

    // Auto-apply referral code credits (supports normal user, admin, and sales channels)
    let creditApplied = false;
    if (referralCode) {
      try {
        creditApplied = await processReferralCode(referralCode, userData.user.id, email);
      } catch (refErr) {
        console.error('[register] referral credit failed:', { referralCode, userId: userData.user.id, error: refErr });
      }
    }

    // Generate and store verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { error: dbError } = await db
      .from('email_verifications')
      .upsert({
        email,
        code,
        type: 'email_verify',
        expires_at: expiresAt,
        verified: false,
        created_at: new Date().toISOString(),
      }, { onConflict: 'email,type' });

    if (dbError) {
      console.error('[register] db:', dbError);
    }

    // Send custom verification email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://koalaphd.com';
    const verifyUrl = `${baseUrl}/koala/auth?mode=verify&email=${encodeURIComponent(email)}&code=${code}`;

    const { error: emailError } = await sendVerificationEmail({
      to: email,
      code,
      verifyUrl,
    });

    if (emailError) {
      console.error('[register] email:', emailError);
      return Response.json({ error: '验证邮件发送失败，请稍后重试' }, { status: 500 });
    }

    notifyNewUserSignup({ email, source: salesCode ? `sales:${salesCode}` : referralCode ? `referral:${referralCode}` : undefined });

    return Response.json({ success: true, message: '注册成功，验证码已发送', creditApplied });
  } catch (error) {
    console.error('[register]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
