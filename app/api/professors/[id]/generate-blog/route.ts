import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { aiLimiter, safeLimit } from '../../../../lib/ratelimit';

export const maxDuration = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await safeLimit(aiLimiter, user.id);
  if (!allowed) return Response.json({ error: '操作太频繁，请稍后再试' }, { status: 429 });

  // 查重下沉到核心 API(generate-professor)统一兜底：draft/published 均视为已存在，
  // 命中返回 409 { code:'ALREADY_EXISTS', postId, slug, status }，本层原样透传给前端。

  // 计费预判(不扣费)：判断是否首次免费 + 余额是否够，扣费推迟到生成成功后。
  const { count } = await db
    .from('credit_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'spend_blog_generation');

  const isFirstTime = (count ?? 0) === 0;

  const { data: profile } = await db.from('user_profiles')
    .select('credits_remaining, plan_type')
    .eq('id', user.id).single();

  const isElite = profile?.plan_type === 'elite';
  const needsPayment = !isFirstTime && !isElite;

  // 余额不足则先拦截，避免白跑一次昂贵的 LLM 生成
  if (needsPayment) {
    const balance = profile?.credits_remaining ?? 0;
    if (balance < 10) {
      return Response.json({
        error: '积分不足',
        needed: 10,
        balance,
        message: `生成教授博客需要 10 积分，当前余额 ${balance}。`,
      }, { status: 402 });
    }
  }

  // Forward to the generate-professor endpoint via internal auth (cookie passthrough不适用server-to-server)
  let genResponse: Response;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const internalSecret = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 32);

    genResponse = await fetch(`${baseUrl}/api/blog/generate-professor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
        'x-internal-user-id': user.id,
      },
      body: JSON.stringify({ professorId: id }),
    });
  } catch (e) {
    console.error('[generate-blog] failed:', e);
    return Response.json({ error: '博客生成失败，请稍后再试' }, { status: 500 });
  }

  // 已存在同教授文章：原样透传 409，未扣费(尚未扣)，前端跳转到该文章
  if (genResponse.status === 409) {
    const dup = await genResponse.json().catch(() => ({ code: 'ALREADY_EXISTS' }));
    return Response.json(dup, { status: 409 });
  }

  if (!genResponse.ok) {
    // 生成失败：本层尚未扣费，无需回滚
    const errData = await genResponse.json().catch(() => ({}));
    return Response.json({
      error: errData.error || '博客生成失败',
      details: errData.details,
    }, { status: genResponse.status });
  }

  const result = await genResponse.json();

  // Auto-publish the generated blog
  if (result.post?.id) {
    await db.from('blog_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', result.post.id);
  }

  // 生成成功后才扣费/记账。扣费失败不回退已生成的文章，但必须写日志人工核对，绝不静默吞掉。
  try {
    if (needsPayment) {
      // 重新读取最新余额，避免预判到扣费之间的漂移
      const { data: fresh } = await db.from('user_profiles')
        .select('credits_remaining')
        .eq('id', user.id).single();
      const balance = fresh?.credits_remaining ?? 0;
      const newBalance = balance - 10;

      await db.from('user_profiles').update({
        credits_remaining: newBalance,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: -10,
        balance_after: newBalance,
        type: 'spend_blog_generation',
        description: '生成教授博客',
        reference_id: id,
      });
    } else {
      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: 0,
        balance_after: profile?.credits_remaining ?? 0,
        type: 'spend_blog_generation',
        description: isFirstTime ? '生成教授博客（首次免费）' : '生成教授博客（Elite 免费）',
        reference_id: id,
      });
    }
  } catch (creditErr) {
    // 文章已生成成功；记账失败只记日志，返回仍视为成功，需人工核对补账
    console.error('[generate-blog] 扣费/记账失败（文章已生成，需人工核对补账）:', {
      userId: user.id,
      professorId: id,
      postId: result.post?.id,
      needsPayment,
      error: (creditErr as Error)?.message,
    });
  }

  return Response.json({
    success: true,
    blog: {
      id: result.post?.id,
      slug: result.post?.slug,
      title: result.title || result.post?.title_zh,
    },
    firstTimeFree: isFirstTime,
  });
}
