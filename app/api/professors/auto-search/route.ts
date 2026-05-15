export const maxDuration = 60;

import type { NextRequest } from 'next/server';
import { searchProfessorAllSources, searchProfessorDeep, saveCandidateToDb } from '../../../lib/services/professorAutoAdd';
import type { ProfessorCandidate } from '../../../lib/services/professorAutoAdd';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { notifyUser } from '../../../lib/notifications';
import { aiLimiter, deepSearchLimiter, safeLimit } from '../../../lib/ratelimit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    const university = req.nextUrl.searchParams.get('university') || undefined;
    const isDeep = req.nextUrl.searchParams.get('deep') === 'true';

    if (!name || name.trim().length < 2) {
      return Response.json({ error: 'Missing or too short name param' }, { status: 400 });
    }

    let candidates: ProfessorCandidate[];

    if (isDeep) {
      const user = await getServerUser();
      if (!user) return Response.json({ error: '请先登录再使用 AI 深度搜索' }, { status: 401 });

      const deepAllowed = await safeLimit(deepSearchLimiter, user.id);
      if (!deepAllowed) return Response.json({ error: 'AI 深度搜索每小时限 5 次，请稍后再试' }, { status: 429 });

      candidates = await searchProfessorDeep(name.trim(), university);
    } else {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const aiAllowed = await safeLimit(aiLimiter, ip);
      if (!aiAllowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

      candidates = await searchProfessorAllSources(name.trim(), university);
    }

    return Response.json({
      candidates,
      total: candidates.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[professors/auto-search GET]', msg, error);
    return Response.json({ error: msg, candidates: [], total: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = await safeLimit(aiLimiter, user.id);
    if (!allowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

    const body = await req.json();
    const candidate = body.candidate as ProfessorCandidate;

    if (!candidate?.name || !candidate?.university) {
      return Response.json({ error: 'candidate with name and university required' }, { status: 400 });
    }

    const professor = await saveCandidateToDb(candidate, user.id);
    if (!professor) {
      return Response.json({ error: '录入失败' }, { status: 500 });
    }

    // Award 10 credits for contributing professor data (fire-and-forget)
    let creditsAwarded = 0;
    let newBalance = 0;
    let referralCode = '';
    try {
      const { data: profile } = await db.from('user_profiles')
        .select('credits_remaining, referral_code')
        .eq('id', user.id).single();
      const currentBalance = profile?.credits_remaining ?? 30;
      newBalance = currentBalance + 10;
      creditsAwarded = 10;
      referralCode = profile?.referral_code || '';

      await db.from('user_profiles').update({
        credits_remaining: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: 10,
        balance_after: newBalance,
        type: 'earn_contribute',
        description: `贡献教授数据：${professor.name}`,
      });

      await notifyUser(
        user.id,
        '感谢贡献教授数据！+10 积分',
        `您帮助我们完善了 ${professor.name}（${professor.university}）的信息，获得 10 积分奖励！当前余额 ${newBalance} 积分。\n\n分享 Koala PhD 给同学，每位注册好友可再赚 15 积分！`,
        'info',
        '/koala/my-profile',
      );
    } catch (e) {
      console.error('[auto-search] credit reward failed:', e);
    }

    return Response.json({
      success: true,
      professor,
      reward: creditsAwarded > 0 ? { credits: creditsAwarded, newBalance, referralCode } : undefined,
    });
  } catch (error) {
    console.error('[professors/auto-search POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
