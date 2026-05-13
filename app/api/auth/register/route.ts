import { supabaseAdmin } from '../../../lib/supabase/server';
import { sendVerificationEmail } from '../../../lib/services/emailService';
import { notifyNewUserSignup } from '../../../lib/server/slack';

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

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

    // Create user_profiles record
    await db.from('user_profiles').upsert({
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

    await db.from('referral_codes').insert({ user_id: userData.user.id, code: refCode }).then(() => {}).catch(() => {});

    // Store referral and sales codes in user metadata
    if (referralCode || salesCode) {
      const meta: Record<string, string> = {};
      if (referralCode) meta.referral_code = referralCode;
      if (salesCode) meta.sales_code = salesCode;
      await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
        user_metadata: { ...userData.user.user_metadata, ...meta },
      });
    }

    // Auto-apply referral code credits
    let creditApplied = false;
    if (referralCode) {
      try {
        const upperCode = referralCode.toUpperCase();
        const { data: referrerProfile } = await db
          .from('user_profiles')
          .select('id, credits_remaining, referral_code')
          .eq('referral_code', upperCode)
          .single();

        if (referrerProfile && referrerProfile.id !== userData.user.id) {
          const { count: referredCount } = await db
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', referrerProfile.id);

          if ((referredCount || 0) < 3) {
            const newReferrerBalance = (referrerProfile.credits_remaining || 0) + 15;
            await db.from('user_profiles')
              .update({ credits_remaining: newReferrerBalance })
              .eq('id', referrerProfile.id);
            await db.from('credit_transactions').insert({
              user_id: referrerProfile.id,
              amount: 15,
              balance_after: newReferrerBalance,
              type: 'earn_referral',
              description: `邀请好友注册（${email.split('@')[0]})`,
              reference_id: userData.user.id,
            });

            const { data: myProfile } = await db
              .from('user_profiles')
              .select('credits_remaining')
              .eq('id', userData.user.id)
              .single();
            const newMyBalance = (myProfile?.credits_remaining ?? 0) + 5;
            await db.from('user_profiles')
              .update({ credits_remaining: newMyBalance, referred_by: referrerProfile.id })
              .eq('id', userData.user.id);
            await db.from('credit_transactions').insert({
              user_id: userData.user.id,
              amount: 5,
              balance_after: newMyBalance,
              type: 'earn_referral',
              description: '使用邀请码注册奖励',
              reference_id: referrerProfile.id,
            });

            const { data: codeRecord } = await db
              .from('referral_codes')
              .select('uses')
              .eq('user_id', referrerProfile.id)
              .single();
            if (codeRecord) {
              await db.from('referral_codes')
                .update({ uses: (codeRecord.uses || 0) + 1 })
                .eq('user_id', referrerProfile.id);
            }
            creditApplied = true;
          }
        }
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
