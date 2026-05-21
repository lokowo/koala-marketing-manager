import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    if (weekStart > today) weekStart.setDate(weekStart.getDate() - 7);
    const weekStartISO = weekStart.toISOString();

    const [
      usersRes,
      professorsRes,
      chunksRes,
      blogPublishedRes,
      blogDraftRes,
      chatTodayRes,
      chatMonthRes,
      outreachTodayRes,
      outreachMonthRes,
      pendingAppsRes,
      adminRolesRes,
      weekLogsRes,
      recentLogsRes,
    ] = await Promise.all([
      db.from('user_profiles').select('id, created_at, role, email'),
      db.from('professors').select('*', { count: 'exact', head: true }),
      db.from('knowledge_chunks').select('*', { count: 'exact', head: true }),
      db.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      db.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      db.from('ai_conversations').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      db.from('ai_conversations').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      db.from('outreach_emails').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      db.from('outreach_emails').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      db.from('role_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('user_roles').select('user_id, role, user_profiles!inner(display_name, email, avatar_url)').in('role', ['super_admin', 'admin']),
      db.from('admin_work_logs').select('admin_id, action, user_profiles!admin_work_logs_admin_profiles_fkey(display_name, email)').gte('created_at', weekStartISO),
      db.from('admin_work_logs').select('*, user_profiles!admin_work_logs_admin_profiles_fkey(display_name, email)').order('created_at', { ascending: false }).limit(20),
    ]);

    const allUsers = usersRes.data || [];
    const todayUsers = allUsers.filter((u: { created_at: string }) => new Date(u.created_at) >= today);

    const adminTeamWeek: Record<string, { name: string; email: string; actions: Record<string, number> }> = {};
    for (const log of weekLogsRes.data ?? []) {
      const uid = log.admin_id;
      if (!adminTeamWeek[uid]) {
        adminTeamWeek[uid] = {
          name: log.user_profiles?.display_name || log.user_profiles?.email || '—',
          email: log.user_profiles?.email || '',
          actions: {},
        };
      }
      adminTeamWeek[uid].actions[log.action] = (adminTeamWeek[uid].actions[log.action] || 0) + 1;
    }

    return Response.json({
      users: { total: allUsers.length, today: todayUsers.length },
      professors: professorsRes.count ?? 0,
      knowledgeChunks: chunksRes.count ?? 0,
      blog: { published: blogPublishedRes.count ?? 0, draft: blogDraftRes.count ?? 0 },
      chat: { today: chatTodayRes.count ?? 0, month: chatMonthRes.count ?? 0 },
      outreach: { today: outreachTodayRes.count ?? 0, month: outreachMonthRes.count ?? 0 },
      pendingApprovals: pendingAppsRes.count ?? 0,
      onlineAdmins: (adminRolesRes.data ?? []).length,
      adminTeamWeek: Object.entries(adminTeamWeek).map(([userId, v]) => ({ userId, ...v })),
      recentActivity: (recentLogsRes.data ?? []).map((l: Record<string, unknown>) => ({
        id: l.id,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        details: l.details,
        createdAt: l.created_at,
        userName: (l.user_profiles as Record<string, string>)?.display_name || (l.user_profiles as Record<string, string>)?.email || '—',
      })),
    });
  } catch (error) {
    console.error('[admin/stats]', error);
    return Response.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}
