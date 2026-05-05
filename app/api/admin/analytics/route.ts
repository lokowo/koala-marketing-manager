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
    platformUsage: [],
    topProfessors: [],
    topBlogs: [],
  };

  try {
    // User growth: count users per day
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (allUsers?.users) {
      const dailyCounts: Record<string, number> = {};
      for (const u of allUsers.users) {
        const day = new Date(u.created_at).toISOString().slice(0, 10);
        if (new Date(day) >= since) {
          dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }
      }
      result.userGrowth = Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date: date.slice(5), count }));
    }
  } catch { /* ignore */ }

  try {
    // Top blogs by view count
    const { data: blogs } = await db
      .from('blog_posts')
      .select('id, title_zh, category, view_count')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(10);
    result.topBlogs = blogs || [];
  } catch { /* ignore */ }

  try {
    // Top professors by saved count
    const { data: saved } = await db
      .from('saved_professors')
      .select('professor_id');
    if (saved) {
      const counts: Record<string, number> = {};
      for (const s of saved) {
        counts[s.professor_id] = (counts[s.professor_id] || 0) + 1;
      }
      const topIds = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const { data: profs } = await db
        .from('professors')
        .select('id, name, university')
        .in('id', topIds.map(([id]) => id));

      result.topProfessors = topIds.map(([profId, count]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prof = (profs || []).find((p: any) => p.id === profId);
        return { id: profId, name: prof?.name || profId, university: prof?.university || '', savedCount: count };
      });
    }
  } catch { /* table may not exist */ }

  return Response.json(result);
}
