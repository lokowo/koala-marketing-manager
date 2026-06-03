import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { ref } = await req.json().catch(() => ({ ref: '' }));
    const userId = user.id;
    const email = user.email || '';
    const displayName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || email.split('@')[0];

    // ─────────────────────────────────────────────────────────────
    // 全程幂等：无论 profile 是否已存在都执行，归属不再依赖"profile 不存在"。
    // handle_new_user 触发器通常已建好 profile；这里只在它极少数失败时补建。
    // ─────────────────────────────────────────────────────────────

    // a) 查 profile，不存在(触发器失败)才 upsert 建档
    const { data: existing } = await db
      .from('user_profiles')
      .select('id, referral_code, referred_by, credits_remaining')
      .eq('id', userId)
      .single();

    const wasNew = !existing;

    if (!existing) {
      await db.from('user_profiles').upsert({
        id: userId,
        display_name: displayName,
        email,
        referral_code: generateReferralCode(),
        credits_remaining: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // 重新读取当前 profile 状态（referral_code / referred_by / 余额）
    const { data: profile } = await db
      .from('user_profiles')
      .select('id, referral_code, referred_by, credits_remaining')
      .eq('id', userId)
      .single();

    // b) 补 referral_code：为空才生成并 update；再保证 referral_codes 行存在
    let refCode: string = profile?.referral_code || '';
    if (!refCode) {
      refCode = generateReferralCode();
      await db.from('user_profiles')
        .update({ referral_code: refCode, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
    await db.from('referral_codes')
      .upsert({ user_id: userId, code: refCode }, { onConflict: 'user_id', ignoreDuplicates: true })
      .catch((e: unknown) => console.error('[oauth-complete] referral_codes upsert:', e));

    // c) ref 归属（带幂等闸，杜绝重复归属与重复发分）
    if (ref) {
      try {
        const upperRef = (ref as string).toUpperCase();

        const { data: referrerProfile } = await db
          .from('user_profiles')
          .select('id, credits_remaining, referral_code, role')
          .eq('referral_code', upperRef)
          .single();

        if (referrerProfile && referrerProfile.id !== userId) {
          // 用户 referral_code 分支：仅当本用户 referred_by 为空才归属
          if (!profile?.referred_by) {
            await db.from('user_profiles').update({ referred_by: referrerProfile.id }).eq('id', userId);

            const { data: codeRecord } = await db.from('referral_codes').select('uses').eq('user_id', referrerProfile.id).single();
            if (codeRecord) {
              await db.from('referral_codes').update({ uses: (codeRecord.uses || 0) + 1 }).eq('user_id', referrerProfile.id);
            }
          }
        } else {
          const { data: salesAgent } = await db
            .from('sales_agents')
            .select('id, user_id')
            .eq('referral_code', upperRef)
            .eq('status', 'active')
            .single();

          if (salesAgent) {
            // sales_agent 分支：仅当本用户尚不在 sales_customers 才执行整段，已在则跳过
            const { data: existingCustomer } = await db
              .from('sales_customers')
              .select('id')
              .eq('customer_user_id', userId)
              .maybeSingle();

            if (!existingCustomer) {
              await db.from('sales_referrals').insert({
                agent_id: salesAgent.id,
                referred_user_id: userId,
                channel: 'google_oauth',
                landing_page: '/',
              }).catch(() => {});

              await db.from('sales_customers').insert({
                sales_user_id: salesAgent.user_id,
                customer_user_id: userId,
                source: 'google_oauth',
                source_code: upperRef,
                stage: 'lead',
              }).catch(() => {});

              const { data: fp } = await db.from('user_profiles').select('credits_remaining').eq('id', userId).single();
              const bal = (fp?.credits_remaining ?? 30) + 5;
              await db.from('user_profiles').update({ credits_remaining: bal }).eq('id', userId);
              await db.from('credit_transactions').insert({
                user_id: userId,
                amount: 5,
                balance_after: bal,
                type: 'earn_referral',
                description: 'Sales 渠道注册奖励 (Google)',
              });
            }
          }
        }
      } catch (e) {
        console.error('[oauth-complete] referral processing:', e);
      }
    }

    // 返回 new/existing 仅用于日志，不再据此跳过逻辑
    console.log('[oauth-complete] Google user processed:', userId, email, wasNew ? '(new)' : '(existing)');
    return NextResponse.json({ status: wasNew ? 'new_user' : 'existing_user', userId });
  } catch (error) {
    console.error('[oauth-complete]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
