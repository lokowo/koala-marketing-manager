import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return Response.json({ error: '缺少邀请码' }, { status: 400 });

    const upperCode = code.toUpperCase();

    const { data: referrerProfile } = await db
      .from('user_profiles')
      .select('id, credits_remaining, referral_code')
      .eq('referral_code', upperCode)
      .single();

    if (!referrerProfile) return Response.json({ error: '无效的邀请码' }, { status: 404 });

    if (referrerProfile.id === user.id) return Response.json({ error: '不能使用自己的邀请码' }, { status: 400 });

    const { data: myProfile } = await db
      .from('user_profiles')
      .select('referred_by, credits_remaining')
      .eq('id', user.id)
      .single();

    if (myProfile?.referred_by) return Response.json({ error: '你已经使用过邀请码了' }, { status: 400 });

    const { count: referredCount } = await db
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', referrerProfile.id);

    if ((referredCount || 0) >= 3) {
      return Response.json({ error: '该邀请码已达使用上限（最多 3 次）' }, { status: 400 });
    }

    const { data: codeRecord } = await db
      .from('referral_codes')
      .select('uses')
      .eq('user_id', referrerProfile.id)
      .single();

    const currentUses = codeRecord?.uses || 0;
    if (currentUses >= 3) {
      return Response.json({ error: '该邀请码已达使用上限（最多 3 次）' }, { status: 400 });
    }

    const newReferrerBalance = (referrerProfile.credits_remaining || 0) + 15;
    await db.from('user_profiles')
      .update({ credits_remaining: newReferrerBalance })
      .eq('id', referrerProfile.id);

    await db.from('credit_transactions').insert({
      user_id: referrerProfile.id,
      amount: 15,
      balance_after: newReferrerBalance,
      type: 'earn_referral',
      description: `邀请好友注册（${user.email?.split('@')[0] || '新用户'}）`,
      reference_id: user.id,
    });

    const newMyBalance = (myProfile?.credits_remaining || 30) + 5;
    await db.from('user_profiles')
      .update({
        credits_remaining: newMyBalance,
        referred_by: referrerProfile.id,
      })
      .eq('id', user.id);

    await db.from('credit_transactions').insert({
      user_id: user.id,
      amount: 5,
      balance_after: newMyBalance,
      type: 'earn_referral',
      description: '使用邀请码注册奖励',
      reference_id: referrerProfile.id,
    });

    if (codeRecord) {
      await db.from('referral_codes')
        .update({ uses: currentUses + 1 })
        .eq('user_id', referrerProfile.id);
    } else {
      await db.from('referral_codes').insert({
        user_id: referrerProfile.id,
        code: upperCode,
        uses: 1,
      });
    }

    return Response.json({
      success: true,
      message: '邀请码使用成功！你获得了 5 积分',
      bonusCredits: 5,
    });
  } catch (e) {
    console.error('[referral/claim]', e);
    return Response.json({ error: '处理失败' }, { status: 500 });
  }
}
