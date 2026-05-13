import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parallel fetch all dashboard data
    const [creditsResult, achievementsResult, tasksResult, emailsResult, conversationsResult] = await Promise.all([
      userId
        ? supabase.from('user_credits').select('*').eq('user_id', userId).single()
        : Promise.resolve({ data: null }),
      userId
        ? supabase.from('user_achievements').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('daily_tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('outreach_emails').select('status, created_at').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('ai_conversations').select('id, mode, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
        : Promise.resolve({ data: [] }),
    ]);

    const credits = creditsResult.data;
    const achievements = achievementsResult.data ?? [];
    const tasks = tasksResult.data ?? [];
    const emails = emailsResult.data ?? [];
    const conversations = conversationsResult.data ?? [];

    // Calculate research readiness score
    const emailsSent = emails.filter((e: { status: string }) => e.status === 'sent' || e.status === 'replied').length;
    const emailsReplied = emails.filter((e: { status: string }) => e.status === 'replied').length;
    const hasCV = achievements.some((a: { achievement_key: string }) => a.achievement_key === 'first_cv');
    const hasMatch = achievements.some((a: { achievement_key: string }) => a.achievement_key === 'first_match');
    const tasksCompleted = tasks.filter((t: { completed: boolean }) => t.completed).length;

    // Score formula (5 dimensions × 20)
    const profileScore = hasCV ? 20 : Math.min(20, conversations.length * 3);
    const matchScore = hasMatch ? 20 : 0;
    const outreachScore = Math.min(20, emailsSent * 5);
    const engagementScore = Math.min(20, tasksCompleted * 4);
    const replyScore = Math.min(20, emailsReplied * 10);
    const readinessScore = profileScore + matchScore + outreachScore + engagementScore + replyScore;

    return Response.json({
      readinessScore,
      dimensions: [
        { name: '背景完善度', score: profileScore },
        { name: '教授匹配', score: matchScore },
        { name: '套磁进度', score: outreachScore },
        { name: '学习参与度', score: engagementScore },
        { name: '回复率', score: replyScore },
      ],
      credits: {
        balance: credits?.credit_balance ?? 0,
        subscriptionTier: credits?.subscription_tier ?? null,
        monthlyCredits: credits?.subscription_monthly_credits ?? 0,
      },
      stats: {
        emailsGenerated: emails.length,
        emailsSent,
        emailsReplied,
        achievementsCount: achievements.length,
        conversationsCount: conversations.length,
        tasksCompleted,
      },
      achievements: achievements.map((a: { achievement_key: string; unlocked_at: string }) => ({
        key: a.achievement_key,
        unlockedAt: a.unlocked_at,
      })),
      recentConversations: conversations.map((c: { id: string; mode: string; created_at: string }) => ({
        id: c.id,
        mode: c.mode,
        createdAt: c.created_at,
      })),
    });
  } catch (e) {
    console.error('[Dashboard]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
