import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    if (weekStart > now) weekStart.setDate(weekStart.getDate() - 7);
    const weekStartISO = weekStart.toISOString();

    const [kpiRes, customersRes, followupsRes] = await Promise.all([
      db.from('kpi_settings').select('*').order('created_at', { ascending: false }).limit(1).single(),
      db.from('sales_customers').select('stage, created_at').eq('sales_user_id', user.id),
      db.from('admin_work_logs').select('id').eq('user_id', user.id).eq('action', 'customer_update').gte('created_at', weekStartISO),
    ]);

    const kpi = kpiRes.data ?? { weekly_new_leads: 10, weekly_followups: 20, weekly_conversions: 2, monthly_revenue_target: 5000 };
    if (kpi.weekly_followups === undefined) kpi.weekly_followups = 20;

    const allCustomers = customersRes.data ?? [];
    const thisWeekCustomers = allCustomers.filter((c: { created_at: string }) => c.created_at >= weekStartISO);
    const thisWeekConverted = thisWeekCustomers.filter((c: { stage: string }) => c.stage === 'converted');
    const thisWeekFollowups = (followupsRes.data ?? []).length;

    return Response.json({
      leads: { current: thisWeekCustomers.length, target: kpi.weekly_new_leads },
      followups: { current: thisWeekFollowups, target: kpi.weekly_followups },
      conversions: { current: thisWeekConverted.length, target: kpi.weekly_conversions },
    });
  } catch (e) {
    console.error('[sales/my-kpi GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
