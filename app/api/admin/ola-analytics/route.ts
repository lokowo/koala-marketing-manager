import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

async function getKPI() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const days30Ago = new Date(now.getTime() - 30 * 86400000).toISOString();
  const days7Ago = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [todaySessions, ratingData, activeUsers, totalSessions] = await Promise.all([
    db.from('ola_sessions').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    db.from('ola_sessions').select('rating').not('rating', 'is', null).gte('created_at', days30Ago),
    db.from('ola_sessions').select('user_id').gte('created_at', days7Ago),
    db.from('ola_sessions').select('id', { count: 'exact', head: true }).gte('created_at', days30Ago),
  ]);

  const ratings = ratingData.data ?? [];
  const avgRating = ratings.length > 0
    ? +(ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : 0;

  const uniqueUsers = new Set((activeUsers.data ?? []).map((r: { user_id: string }) => r.user_id));

  return {
    todaySessions: todaySessions.count ?? 0,
    avgRating30d: avgRating,
    activeUsers7d: uniqueUsers.size,
    totalSessions30d: totalSessions.count ?? 0,
  };
}

async function getFunnel() {
  const { data } = await db.from('ola_sessions').select('metadata');
  const stageCounts: Record<string, number> = {};
  let total = 0;

  for (const row of data ?? []) {
    const stage = row.metadata?.conversation_stage || 'unknown';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    total++;
  }

  const stageOrder = [
    'greeting', 'background_collection', 'goal_clarification',
    'assessment', 'matching', 'outreach', 'follow_up', 'completed',
  ];

  return stageOrder.map(stage => ({
    stage,
    count: stageCounts[stage] || 0,
    percentage: total > 0 ? +((stageCounts[stage] || 0) / total * 100).toFixed(1) : 0,
  }));
}

async function getRatings() {
  const days30Ago = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data: sessions } = await db
    .from('ola_sessions')
    .select('id, rating, user_id, metadata, created_at')
    .not('rating', 'is', null)
    .gte('created_at', days30Ago)
    .order('created_at', { ascending: false });

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const lowRated: Array<{ sessionId: string; rating: number; comment: string | null; ratedAt: string; userId: string }> = [];

  for (const s of sessions ?? []) {
    const r = s.rating as number;
    if (r >= 1 && r <= 5) distribution[r]++;
    if (r <= 2) {
      lowRated.push({
        sessionId: s.id,
        rating: r,
        comment: s.metadata?.rating_comment ?? null,
        ratedAt: s.created_at,
        userId: s.user_id,
      });
    }
  }

  return { distribution, lowRated };
}

async function getTriggers() {
  const { data: logs } = await db.from('ola_trigger_logs').select('trigger_key, action');

  const stats: Record<string, { shown: number; clicked: number; dismissed: number }> = {};

  for (const log of logs ?? []) {
    const key = log.trigger_key;
    if (!stats[key]) stats[key] = { shown: 0, clicked: 0, dismissed: 0 };
    stats[key].shown++;
    if (log.action === 'clicked') stats[key].clicked++;
    if (log.action === 'dismissed') stats[key].dismissed++;
  }

  return Object.entries(stats).map(([triggerKey, s]) => ({
    triggerKey,
    shown: s.shown,
    clicked: s.clicked,
    dismissed: s.dismissed,
    clickRate: s.shown > 0 ? +((s.clicked / s.shown) * 100).toFixed(1) : 0,
  })).sort((a, b) => b.clickRate - a.clickRate);
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');

    if (!section || !['kpi', 'funnel', 'ratings', 'triggers'].includes(section)) {
      return Response.json({ error: 'Invalid section. Use: kpi, funnel, ratings, triggers' }, { status: 400 });
    }

    let data;
    switch (section) {
      case 'kpi': data = await getKPI(); break;
      case 'funnel': data = await getFunnel(); break;
      case 'ratings': data = await getRatings(); break;
      case 'triggers': data = await getTriggers(); break;
    }

    return Response.json(data);
  } catch (error) {
    console.error('[ola-analytics]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
