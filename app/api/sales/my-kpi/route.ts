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

    const [kpiRes, customersRes, contactLogsRes, convertedRes] = await Promise.all([
      db.from('kpi_settings').select('*').order('created_at', { ascending: false }).limit(1).single(),
      // This week's new registrations via my promotions
      db.from('sales_customers').select('id', { count: 'exact', head: true })
        .eq('sales_user_id', user.id).gte('created_at', weekStartISO),
      // This week's "contacted" stage changes
      db.from('admin_work_logs').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('action', 'customer_stage_change')
        .gte('created_at', weekStartISO),
      // This week's conversions
      db.from('sales_customers').select('id', { count: 'exact', head: true })
        .eq('sales_user_id', user.id).eq('stage', 'converted')
        .gte('updated_at', weekStartISO),
    ]);

    const kpi = kpiRes.data ?? { weekly_new_leads: 10, weekly_followups: 20, weekly_conversions: 2 };

    return Response.json({
      leads: { current: customersRes.count || 0, target: kpi.weekly_new_leads || 10 },
      followups: { current: contactLogsRes.count || 0, target: kpi.weekly_followups || 20 },
      conversions: { current: convertedRes.count || 0, target: kpi.weekly_conversions || 2 },
    });
  } catch (e) {
    console.error('[sales/my-kpi GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
