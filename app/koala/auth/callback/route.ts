import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') || '/koala/home';
  const refCode = url.searchParams.get('ref');

  const response = NextResponse.redirect(new URL(next, req.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data?.user) {
      const userId = data.user.id;
      const email = data.user.email || '';
      const displayName = data.user.user_metadata?.full_name
        || data.user.user_metadata?.name
        || email.split('@')[0];

      const { data: existing } = await db
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existing) {
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
        }).catch((e: unknown) => console.error('[callback] referral_codes insert:', e));

        if (refCode) {
          try {
            const upperRef = refCode.toUpperCase();

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
            console.error('[callback] referral processing:', e);
          }
        }

        console.log('[callback] new Google user initialized:', userId, email);
      }
    }
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' });
  }

  return response;
}
