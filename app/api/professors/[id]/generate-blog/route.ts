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

  // Check if a published blog already exists for this professor
  const { data: existingBlog } = await db
    .from('blog_posts')
    .select('id, slug, title')
    .eq('professor_id', id)
    .eq('status', 'published')
    .limit(1)
    .maybeSingle();

  if (existingBlog) {
    return Response.json({ exists: true, blog: existingBlog });
  }

  // Check first-time-free: has this user ever generated a professor blog?
  const { count } = await db
    .from('credit_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('type', 'spend_blog_generation');

  const isFirstTime = (count ?? 0) === 0;

  if (!isFirstTime) {
    // Check and deduct 10 credits
    const { data: profile } = await db.from('user_profiles')
      .select('credits_remaining, plan_type')
      .eq('id', user.id).single();

    const balance = profile?.credits_remaining ?? 0;

    if (profile?.plan_type !== 'elite' && balance < 10) {
      return Response.json({
        error: '积分不足',
        needed: 10,
        balance,
        message: `生成教授博客需要 10 积分，当前余额 ${balance}。`,
      }, { status: 402 });
    }

    if (profile?.plan_type !== 'elite') {
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
      const currentBalance = profile?.credits_remaining ?? 0;
      await db.from('credit_transactions').insert({
        user_id: user.id,
        amount: 0,
        balance_after: currentBalance,
        type: 'spend_blog_generation',
        description: '生成教授博客（Elite 免费）',
        reference_id: id,
      });
    }
  } else {
    // First time free — still log the transaction for tracking
    const { data: profile } = await db.from('user_profiles')
      .select('credits_remaining')
      .eq('id', user.id).single();

    await db.from('credit_transactions').insert({
      user_id: user.id,
      amount: 0,
      balance_after: profile?.credits_remaining ?? 0,
      type: 'spend_blog_generation',
      description: '生成教授博客（首次免费）',
      reference_id: id,
    });
  }

  // Forward to the generate-professor endpoint via internal auth (cookie passthrough不适用server-to-server)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const internalSecret = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 32);

    const genResponse = await fetch(`${baseUrl}/api/blog/generate-professor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
        'x-internal-user-id': user.id,
      },
      body: JSON.stringify({ professorId: id }),
    });

    if (!genResponse.ok) {
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

    return Response.json({
      success: true,
      blog: {
        id: result.post?.id,
        slug: result.post?.slug,
        title: result.title,
      },
      firstTimeFree: isFirstTime,
    });
  } catch (e) {
    console.error('[generate-blog] failed:', e);
    return Response.json({ error: '博客生成失败，请稍后再试' }, { status: 500 });
  }
}
