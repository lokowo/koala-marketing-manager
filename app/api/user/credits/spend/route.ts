import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const COSTS: Record<string, { amount: number; label: string }> = {
  match:  { amount: 2, label: '教授匹配' },
  email:  { amount: 5, label: '生成套磁信' },
  chat:   { amount: 1, label: 'AI 对话' },
  plan:   { amount: 3, label: '选校规划' },
  polish: { amount: 5, label: '文书润色' },
  blog_generation: { amount: 10, label: '生成教授博客' },
};

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, referenceId } = await req.json();

    if (!type || !COSTS[type]) {
      return Response.json({ error: 'Invalid spend type' }, { status: 400 });
    }

    const cost = COSTS[type];

    const { data: profile } = await db.from('user_profiles')
      .select('credits_remaining, plan_type')
      .eq('id', user.id).single();

    const currentBalance = profile?.credits_remaining ?? 0;

    if (profile?.plan_type === 'elite') {
      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: 0,
        balance_after: currentBalance,
        type: `spend_${type}`,
        description: `${cost.label}（Elite 免费）`,
        reference_id: referenceId || null,
      });
      return Response.json({ success: true, remaining: currentBalance, free: true });
    }

    if (currentBalance < cost.amount) {
      return Response.json({
        error: '积分不足',
        featureName: cost.label,
        needed: cost.amount,
        balance: currentBalance,
        message: `${cost.label}需要 ${cost.amount} 积分，当前余额 ${currentBalance}。`,
        pricingUrl: '/koala/pricing#credit-packs',
      }, { status: 402 });
    }

    const newBalance = currentBalance - cost.amount;

    await db.from('user_profiles').update({
      credits_remaining: newBalance,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    await db.from('credit_transactions').insert({
      user_id: user.id,
      amount: -cost.amount,
      balance_after: newBalance,
      type: `spend_${type}`,
      description: cost.label,
      reference_id: referenceId || null,
    });

    return Response.json({ success: true, remaining: newBalance, spent: cost.amount });
  } catch (error) {
    console.error('[credits/spend POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
