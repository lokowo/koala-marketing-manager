import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

const ACHIEVEMENT_REWARDS: Record<string, { credits: number; description: string }> = {
  profile_80:    { credits: 20, description: '完善资料到 80%' },
  first_resume:  { credits: 10, description: '上传第一份简历' },
  first_save:    { credits: 5,  description: '收藏第一个教授' },
  first_email:   { credits: 10, description: '发送第一封套磁信' },
};

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [profileRes, txRes, achRes, refRes] = await Promise.all([
      db.from('user_profiles').select('credits_remaining, last_daily_credit, referral_code').eq('id', user.id).single(),
      db.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      db.from('user_achievements').select('achievement_key, unlocked_at').eq('user_id', user.id),
      db.from('referral_codes').select('code, uses').eq('user_id', user.id).single(),
    ]);

    const profile = profileRes.data;
    const balance = profile?.credits_remaining ?? 30;

    let referralCode = refRes.data?.code || profile?.referral_code;
    if (!referralCode) {
      referralCode = generateCode();
      await db.from('referral_codes').insert({ user_id: user.id, code: referralCode });
      await db.from('user_profiles').update({ referral_code: referralCode }).eq('id', user.id);
    }

    const lastDaily = profile?.last_daily_credit ? new Date(profile.last_daily_credit) : null;
    const todayClaimed = lastDaily ? isSameDay(lastDaily, new Date()) : false;

    return Response.json({
      balance,
      todayClaimed,
      referralCode,
      referralUses: refRes.data?.uses ?? 0,
      recentTransactions: txRes.data ?? [],
      achievements: (achRes.data ?? []).map((a: { achievement_key: string }) => a.achievement_key),
    });
  } catch (error) {
    console.error('[credits GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, achievementKey } = await req.json();

    const { data: profile } = await db.from('user_profiles')
      .select('credits_remaining, last_daily_credit')
      .eq('id', user.id).single();

    let currentBalance = profile?.credits_remaining ?? 30;

    if (action === 'daily_checkin') {
      const lastDaily = profile?.last_daily_credit ? new Date(profile.last_daily_credit) : null;
      if (lastDaily && isSameDay(lastDaily, new Date())) {
        return Response.json({ error: '今日已签到', todayClaimed: true, balance: currentBalance });
      }

      const reward = 2;
      currentBalance += reward;

      await db.from('user_profiles').update({
        credits_remaining: currentBalance,
        last_daily_credit: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: reward,
        balance_after: currentBalance,
        type: 'earn_daily',
        description: '每日签到',
      });

      return Response.json({ success: true, earned: reward, balance: currentBalance, todayClaimed: true });
    }

    if (action === 'claim_achievement') {
      if (!achievementKey || !ACHIEVEMENT_REWARDS[achievementKey]) {
        return Response.json({ error: 'Invalid achievement' }, { status: 400 });
      }

      const { data: existing } = await db.from('user_achievements')
        .select('id').eq('user_id', user.id).eq('achievement_key', achievementKey).single();

      if (existing) {
        return Response.json({ error: '已领取过该奖励', balance: currentBalance });
      }

      const reward = ACHIEVEMENT_REWARDS[achievementKey];
      currentBalance += reward.credits;

      await db.from('user_achievements').insert({
        user_id: user.id,
        achievement_key: achievementKey,
      });

      await db.from('user_profiles').update({
        credits_remaining: currentBalance,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: reward.credits,
        balance_after: currentBalance,
        type: 'earn_achievement',
        description: reward.description,
      });

      return Response.json({ success: true, earned: reward.credits, balance: currentBalance });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[credits POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
