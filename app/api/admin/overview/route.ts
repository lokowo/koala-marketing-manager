import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireSuperAdmin();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString();

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    if (weekStart > today) weekStart.setDate(weekStart.getDate() - 7);
    const weekStartISO = weekStart.toISOString();

    const [
      usersRes,
      chatTodayRes,
      chatYesterdayRes,
      outreachTodayRes,
      outreachYesterdayRes,
      pendingAppsRes,
      adminRolesRes,
      weekLogsRes,
      recentLogsRes,
      salesUsersRes,
      customersRes,
      kpiRes,
      qrcodesRes,
      followupsRes,
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers(),
      db.from('ai_conversations').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      db.from('ai_conversations').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayISO).lt('created_at', todayISO),
      db.from('outreach_emails').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      db.from('outreach_emails').select('*', { count: 'exact', head: true }).gte('created_at', yesterdayISO).lt('created_at', todayISO),
      db.from('role_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('user_roles').select('user_id, role, user_profiles!inner(display_name, email)').in('role', ['super_admin', 'admin', 'sales']),
      db.from('admin_work_logs').select('admin_id, action, action_category, details, user_profiles!admin_work_logs_admin_profiles_fkey(display_name, email)').gte('created_at', weekStartISO),
      db.from('admin_work_logs').select('*, user_profiles!admin_work_logs_admin_profiles_fkey(display_name, email)').order('created_at', { ascending: false }).limit(20),
      db.from('user_roles').select('user_id, user_profiles!inner(display_name, email)').eq('role', 'sales'),
      db.from('sales_customers').select('sales_user_id, stage, created_at'),
      db.from('kpi_settings').select('*').order('created_at', { ascending: false }).limit(1).single(),
      db.from('sales_qrcodes').select('sales_user_id, scan_count'),
      db.from('admin_work_logs').select('admin_id').eq('action', 'customer_update').gte('created_at', weekStartISO),
    ]);

    const allUsers = usersRes.data?.users || [];
    const todayUsers = allUsers.filter((u: { created_at: string }) => new Date(u.created_at) >= today);
    const yesterdayUsers = allUsers.filter((u: { created_at: string }) => {
      const d = new Date(u.created_at);
      return d >= yesterday && d < today;
    });

    const statCards = {
      newRegistrations: { today: todayUsers.length, yesterday: yesterdayUsers.length },
      activeChats: { today: chatTodayRes.count ?? 0, yesterday: chatYesterdayRes.count ?? 0 },
      outreach: { today: outreachTodayRes.count ?? 0, yesterday: outreachYesterdayRes.count ?? 0 },
      revenue: { today: 0, yesterday: 0 },
      pendingApprovals: pendingAppsRes.count ?? 0,
      onlineStaff: (adminRolesRes.data ?? []).length,
    };

    const adminTeamWeek: Record<string, { name: string; email: string; actions: Record<string, number>; lastActive: string }> = {};
    const allLogs = weekLogsRes.data ?? [];
    for (const log of allLogs) {
      const logRole = (log.details as Record<string, unknown>)?.role;
      if (logRole === 'sales') continue;
      const uid = log.admin_id;
      if (!adminTeamWeek[uid]) {
        adminTeamWeek[uid] = {
          name: log.user_profiles?.display_name || log.user_profiles?.email || '—',
          email: log.user_profiles?.email || '',
          actions: {},
          lastActive: '',
        };
      }
      const cat = log.action_category || log.action;
      adminTeamWeek[uid].actions[cat] = (adminTeamWeek[uid].actions[cat] || 0) + 1;
    }

    const kpi = kpiRes.data ?? { weekly_new_leads: 10, weekly_followups: 20, weekly_conversions: 2 };
    const allCustomers = customersRes.data ?? [];
    const followupLogs = followupsRes.data ?? [];

    const salesLeaderboard = (salesUsersRes.data ?? []).map((s: { user_id: string; user_profiles: { display_name: string; email: string } }) => {
      const thisWeekCustomers = allCustomers.filter((c: { sales_user_id: string; created_at: string }) =>
        c.sales_user_id === s.user_id && c.created_at >= weekStartISO
      );
      const converted = thisWeekCustomers.filter((c: { stage: string }) => c.stage === 'converted').length;
      const followups = followupLogs.filter((f: { admin_id: string }) => f.admin_id === s.user_id).length;
      const scans = (qrcodesRes.data ?? [])
        .filter((q: { sales_user_id: string }) => q.sales_user_id === s.user_id)
        .reduce((sum: number, q: { scan_count: number }) => sum + (q.scan_count || 0), 0);
      const leadsMet = thisWeekCustomers.length >= kpi.weekly_new_leads;
      const followupsMet = followups >= kpi.weekly_followups;

      return {
        userId: s.user_id,
        name: s.user_profiles.display_name || s.user_profiles.email,
        newRegistrations: thisWeekCustomers.length,
        kpiTarget: kpi.weekly_new_leads,
        met: leadsMet && followupsMet,
        followups,
        scans,
        converted,
        revenue: 0,
      };
    });

    const recentActivity = (recentLogsRes.data ?? []).map((l: Record<string, unknown>) => {
      const logRole = ((l.details as Record<string, unknown>)?.role as string) || 'admin';
      return {
        id: l.id,
        action: l.action,
        actionCategory: l.action_category,
        targetType: l.target_type,
        targetId: l.target_id,
        targetName: l.target_name,
        details: l.details,
        createdAt: l.created_at,
        userName: (l.user_profiles as Record<string, string>)?.display_name || (l.user_profiles as Record<string, string>)?.email || '—',
        role: logRole,
      };
    });

    return Response.json({
      statCards,
      adminTeamWeek: Object.entries(adminTeamWeek).map(([userId, v]) => ({ userId, ...v })),
      salesLeaderboard: salesLeaderboard.sort((a: { converted: number }, b: { converted: number }) => b.converted - a.converted),
      recentActivity,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/overview GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
