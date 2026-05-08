import type { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    if (weekStart > now) weekStart.setDate(weekStart.getDate() - 7);
    const weekStartISO = weekStart.toISOString();

    const [profileRes, roleRes, allLogsRes, weekLogsRes, customersRes, qrcodesRes, kpiRes] = await Promise.all([
      db.from('user_profiles').select('display_name, email, avatar_url').eq('id', userId).single(),
      db.from('user_roles').select('role, created_at').eq('user_id', userId).single(),
      db.from('admin_work_logs').select('action, created_at', { count: 'exact' }).eq('user_id', userId),
      db.from('admin_work_logs').select('action, created_at').eq('user_id', userId).gte('created_at', weekStartISO),
      db.from('sales_customers').select('id, stage, created_at, user_profiles(display_name, email)').eq('sales_user_id', userId),
      db.from('sales_qrcodes').select('scan_count').eq('sales_user_id', userId),
      db.from('kpi_settings').select('*').order('created_at', { ascending: false }).limit(1).single(),
    ]);

    const profileData = profileRes.data;
    const roleData = roleRes.data;

    if (!profileData) return Response.json({ error: 'User not found' }, { status: 404 });

    const profile = {
      display_name: profileData.display_name || '',
      email: profileData.email || '',
      avatar_url: profileData.avatar_url,
      role: roleData?.role || 'viewer',
      totalActions: allLogsRes.count ?? 0,
    };

    // Daily chart for current week
    const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const dailyBuckets = new Array(7).fill(0);
    for (const log of weekLogsRes.data ?? []) {
      const d = new Date(log.created_at);
      const dayOfWeek = (d.getDay() + 6) % 7;
      dailyBuckets[dayOfWeek]++;
    }
    const dailyChart = dayLabels.map((day, i) => ({ day, count: dailyBuckets[i] }));

    // Weekly summary (last 8 weeks)
    const allLogs = allLogsRes.data ?? [];
    const weekBuckets: Record<string, Record<string, number>> = {};
    for (const log of allLogs) {
      const d = new Date(log.created_at);
      const ws = new Date(d);
      ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
      const weekKey = ws.toISOString().slice(0, 10);
      if (!weekBuckets[weekKey]) weekBuckets[weekKey] = {};
      weekBuckets[weekKey][log.action] = (weekBuckets[weekKey][log.action] || 0) + 1;
    }
    const weeklySummary = Object.entries(weekBuckets)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 8)
      .map(([week, categories]) => ({
        week,
        categories,
        total: Object.values(categories).reduce((a, b) => a + b, 0),
      }));

    // Sales-specific stats
    let salesStats = null;
    if (roleData?.role === 'sales') {
      const kpi = kpiRes.data ?? { weekly_new_leads: 10, weekly_followups: 20 };
      const allCustomers = customersRes.data ?? [];
      const thisWeekCustomers = allCustomers.filter((c: { created_at: string }) => c.created_at >= weekStartISO);
      const followups = (weekLogsRes.data ?? []).filter((l: { action: string }) => l.action === 'customer_update').length;
      const scans = (qrcodesRes.data ?? []).reduce((sum: number, q: { scan_count: number }) => sum + (q.scan_count || 0), 0);

      salesStats = {
        newRegistrations: thisWeekCustomers.length,
        kpiTarget: kpi.weekly_new_leads,
        met: thisWeekCustomers.length >= kpi.weekly_new_leads && followups >= kpi.weekly_followups,
        scans,
        followups,
        converted: allCustomers.filter((c: { stage: string }) => c.stage === 'converted').length,
        revenue: 0,
        customers: allCustomers.slice(0, 20).map((c: { id: string; stage: string; created_at: string; user_profiles: { display_name: string; email: string } | null }) => ({
          id: c.id,
          name: c.user_profiles?.display_name || c.user_profiles?.email || '未知',
          stage: c.stage,
          created_at: c.created_at,
        })),
      };
    }

    return Response.json({ profile, dailyChart, weeklySummary, salesStats });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/user-detail GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
