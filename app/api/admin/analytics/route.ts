import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const range = parseInt(req.nextUrl.searchParams.get('days') || '30');
  const since = new Date();
  since.setDate(since.getDate() - range);
  const sinceISO = since.toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {
    userGrowth: [],
    topProfessors: [],
    topBlogs: [],
    salesFunnel: {},
    universityDistribution: [],
    engagementMetrics: {},
    chatModeDistribution: [],
    dailyActivity: [],
  };

  try {
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (allUsers?.users) {
      const dailyCounts: Record<string, number> = {};
      let cumulative = 0;
      const sortedUsers = [...allUsers.users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (const u of sortedUsers) {
        const day = new Date(u.created_at).toISOString().slice(0, 10);
        if (new Date(day) >= since) {
          dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }
      }
      const days = Object.entries(dailyCounts).sort(([a], [b]) => a.localeCompare(b));
      const beforeRange = sortedUsers.filter(u => new Date(u.created_at) < since).length;
      cumulative = beforeRange;
      result.userGrowth = days.map(([date, count]) => {
        cumulative += count;
        return { date: date.slice(5), count, cumulative };
      });
      result.engagementMetrics.totalUsers = allUsers.users.length;
      result.engagementMetrics.newUsersInRange = days.reduce((s, [, c]) => s + c, 0);
    }
  } catch { /* ignore */ }

  try {
    const { data: blogs } = await db
      .from('blog_posts')
      .select('id, title_zh, category, view_count')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(10);
    result.topBlogs = blogs || [];
  } catch { /* ignore */ }

  try {
    const { data: saved } = await db.from('saved_professors').select('professor_id');
    if (saved) {
      const counts: Record<string, number> = {};
      for (const s of saved) counts[s.professor_id] = (counts[s.professor_id] || 0) + 1;
      const topIds = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10);
      const { data: profs } = await db.from('professors').select('id, name, university').in('id', topIds.map(([id]) => id));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.topProfessors = topIds.map(([profId, count]) => {
        const prof = (profs || []).find((p: any) => p.id === profId);
        return { id: profId, name: prof?.name || profId, university: prof?.university || '', savedCount: count };
      });
    }
  } catch { /* table may not exist */ }

  try {
    const { data: customers } = await db.from('sales_customers').select('stage');
    if (customers) {
      const funnel: Record<string, number> = {};
      for (const c of customers) funnel[c.stage] = (funnel[c.stage] || 0) + 1;
      result.salesFunnel = funnel;
    }
  } catch { /* ignore */ }

  try {
    const { data: profs } = await db.from('professors').select('university').limit(5000);
    if (profs) {
      const uniCounts: Record<string, number> = {};
      for (const p of profs) uniCounts[p.university] = (uniCounts[p.university] || 0) + 1;
      result.universityDistribution = Object.entries(uniCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([name, count]) => ({ name: name.replace('University of ', 'U ').replace('The ', ''), count }));
    }
  } catch { /* ignore */ }

  try {
    const [chatsRes, outreachRes, convosRes] = await Promise.all([
      db.from('ai_conversations').select('created_at').gte('created_at', sinceISO),
      db.from('outreach_emails').select('created_at').gte('created_at', sinceISO),
      db.from('ai_conversations').select('mode', { count: 'exact', head: false }).gte('created_at', sinceISO),
    ]);

    const dailyMap: Record<string, { chats: number; outreach: number }> = {};
    for (const c of chatsRes.data ?? []) {
      const d = new Date(c.created_at).toISOString().slice(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { chats: 0, outreach: 0 };
      dailyMap[d].chats++;
    }
    for (const o of outreachRes.data ?? []) {
      const d = new Date(o.created_at).toISOString().slice(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { chats: 0, outreach: 0 };
      dailyMap[d].outreach++;
    }
    result.dailyActivity = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date: date.slice(5), ...counts }));

    result.engagementMetrics.totalChats = (chatsRes.data ?? []).length;
    result.engagementMetrics.totalOutreach = (outreachRes.data ?? []).length;

    if (convosRes.data) {
      const modeCounts: Record<string, number> = {};
      for (const c of convosRes.data) {
        const mode = c.mode || 'unknown';
        modeCounts[mode] = (modeCounts[mode] || 0) + 1;
      }
      const modeLabels: Record<string, string> = { path: '路径评估', research: '科研深潜', chat: '陪伴对话', write: '文案写作' };
      result.chatModeDistribution = Object.entries(modeCounts)
        .map(([mode, count]) => ({ mode: modeLabels[mode] || mode, count }))
        .sort((a, b) => b.count - a.count);
    }
  } catch { /* ignore */ }

  return Response.json(result);
}
