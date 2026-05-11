import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

/**
 * Customer Engagement Scoring Algorithm
 *
 * Dimensions (100 points total):
 *   1. AI Chat Activity (30 pts) — conversation count + message depth
 *   2. Professor Engagement (25 pts) — saved professors + profile views
 *   3. Profile Completeness (15 pts) — how much they've filled in
 *   4. Outreach Activity (20 pts) — generated emails
 *   5. Recency (10 pts) — how recently they were active
 *
 * Engagement levels:
 *   🔥 High (70-100)  — very active, likely to convert
 *   🟡 Medium (40-69) — moderate activity, worth nurturing
 *   🔵 Low (15-39)    — signed up but barely engaged
 *   ⚪ Dormant (0-14)  — inactive, might be lost
 */

export interface EngagementScore {
  userId: string;
  displayName: string;
  email: string;
  totalScore: number;
  level: 'high' | 'medium' | 'low' | 'dormant';
  breakdown: {
    chatActivity: number;
    professorEngagement: number;
    profileCompleteness: number;
    outreachActivity: number;
    recency: number;
  };
  stats: {
    conversationCount: number;
    savedProfessors: number;
    emailsGenerated: number;
    profilePct: number;
    daysSinceLastActive: number;
    registeredDaysAgo: number;
  };
}

function getLevel(score: number): EngagementScore['level'] {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 15) return 'low';
  return 'dormant';
}

function daysBetween(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    // For super_admin: pass salesUserId to get a specific sales user's customers
    const salesUserId = (role === 'super_admin' || role === 'admin')
      ? (sp.get('salesUserId') || user.id)
      : user.id;

    // 1. Get all customers for this sales user
    const { data: customers } = await db
      .from('sales_customers')
      .select('customer_user_id, stage, created_at')
      .eq('sales_user_id', salesUserId);

    if (!customers || customers.length === 0) {
      return Response.json({ data: [], summary: { high: 0, medium: 0, low: 0, dormant: 0, total: 0, avgScore: 0 } });
    }

    const customerUserIds = customers.map((c: { customer_user_id: string }) => c.customer_user_id);

    // 2. Fetch all engagement data in parallel
    const [profilesRes, convsRes, savedRes, outreachRes] = await Promise.all([
      db.from('user_profiles')
        .select('id, display_name, email, profile_completeness, updated_at, created_at')
        .in('id', customerUserIds),
      db.from('ai_conversations')
        .select('user_id, id, created_at')
        .in('user_id', customerUserIds),
      db.from('saved_professors')
        .select('user_id, id')
        .in('user_id', customerUserIds),
      db.from('outreach_emails')
        .select('user_id, id')
        .in('user_id', customerUserIds),
    ]);

    const profiles = profilesRes.data ?? [];
    const conversations = convsRes.data ?? [];
    const saved = savedRes.data ?? [];
    const outreach = outreachRes.data ?? [];

    // 3. Calculate engagement scores
    const scores: EngagementScore[] = customerUserIds.map((uid: string) => {
      const prof = profiles.find((p: { id: string }) => p.id === uid);
      const convCount = conversations.filter((c: { user_id: string }) => c.user_id === uid).length;
      const savedCount = saved.filter((s: { user_id: string }) => s.user_id === uid).length;
      const emailCount = outreach.filter((o: { user_id: string }) => o.user_id === uid).length;
      const profilePct = prof?.profile_completeness ?? 0;

      // Find most recent activity
      const convDates = conversations
        .filter((c: { user_id: string }) => c.user_id === uid)
        .map((c: { created_at: string }) => new Date(c.created_at).getTime());
      const lastActivity = convDates.length > 0 ? new Date(Math.max(...convDates)).toISOString() : (prof?.updated_at ?? prof?.created_at ?? new Date().toISOString());
      const daysSinceActive = daysBetween(lastActivity);
      const registeredDaysAgo = daysBetween(prof?.created_at ?? new Date().toISOString());

      // Score: Chat Activity (0-30)
      const chatScore = Math.min(30, convCount * 5);

      // Score: Professor Engagement (0-25)
      const profScore = Math.min(25, savedCount * 5 + Math.min(10, emailCount > 0 ? 10 : 0));

      // Score: Profile Completeness (0-15)
      const profileScore = Math.round((profilePct / 100) * 15);

      // Score: Outreach Activity (0-20)
      const outreachScore = Math.min(20, emailCount * 8);

      // Score: Recency (0-10)
      let recencyScore = 10;
      if (daysSinceActive > 30) recencyScore = 0;
      else if (daysSinceActive > 14) recencyScore = 3;
      else if (daysSinceActive > 7) recencyScore = 5;
      else if (daysSinceActive > 3) recencyScore = 7;
      else if (daysSinceActive > 1) recencyScore = 9;

      const totalScore = chatScore + profScore + profileScore + outreachScore + recencyScore;

      return {
        userId: uid,
        displayName: prof?.display_name ?? '',
        email: prof?.email ?? '',
        totalScore,
        level: getLevel(totalScore),
        breakdown: {
          chatActivity: chatScore,
          professorEngagement: profScore,
          profileCompleteness: profileScore,
          outreachActivity: outreachScore,
          recency: recencyScore,
        },
        stats: {
          conversationCount: convCount,
          savedProfessors: savedCount,
          emailsGenerated: emailCount,
          profilePct,
          daysSinceLastActive: daysSinceActive,
          registeredDaysAgo,
        },
      };
    });

    // Sort by score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    const summary = {
      high: scores.filter(s => s.level === 'high').length,
      medium: scores.filter(s => s.level === 'medium').length,
      low: scores.filter(s => s.level === 'low').length,
      dormant: scores.filter(s => s.level === 'dormant').length,
      total: scores.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length) : 0,
    };

    return Response.json({ data: scores, summary });
  } catch (e) {
    console.error('[sales/customer-engagement GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
