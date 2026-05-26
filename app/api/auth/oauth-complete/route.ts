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

    const { data: existing } = await db
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ status: 'existing_user' });
    }

    const newRefCode = generateReferralCode();

    await db.from('user_profiles').upsert({
      id: userId,
      display_name: displayName,
      email,
      referral_code: newRefCode,
      credits_remaining: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    await db.from('referral_codes').insert({
      user_id: userId,
      code: newRefCode,
    }).catch((e: unknown) => console.error('[oauth-complete] referral_codes insert:', e));

    if (ref) {
      try {
        const upperRef = (ref as string).toUpperCase();

        const { data: referrerProfile } = await db
          .from('user_profiles')
          .select('id, credits_remaining, referral_code, role')
          .eq('referral_code', upperRef)
          .single();

        if (referrerProfile && referrerProfile.id !== userId) {
          await db.from('user_profiles').update({ referred_by: referrerProfile.id }).eq('id', userId);

          const { data: codeRecord } = await db.from('referral_codes').select('uses').eq('user_id', referrerProfile.id).single();
          if (codeRecord) {
            await db.from('referral_codes').update({ uses: (codeRecord.uses || 0) + 1 }).eq('user_id', referrerProfile.id);
          }
        } else {
          const { data: salesAgent } = await db
            .from('sales_agents')
            .select('id, user_id')
            .eq('referral_code', upperRef)
            .eq('status', 'active')
            .single();

          if (salesAgent) {
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
      } catch (e) {
        console.error('[oauth-complete] referral processing:', e);
      }
    }

    console.log('[oauth-complete] new Google user initialized:', userId, email);
    return NextResponse.json({ status: 'new_user', userId });
  } catch (error) {
    console.error('[oauth-complete]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
