import type { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function getWeekStartISO() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  if (weekStart > now) weekStart.setDate(weekStart.getDate() - 7);
  return weekStart.toISOString();
}

export async function GET() {
  try {
    await requireSuperAdmin();

    const weekStartISO = getWeekStartISO();

    const [kpiRes, historyRes, salesRes, customersRes, followupsRes, contactsRes] = await Promise.all([
      db.from('kpi_settings').select('*').order('created_at', { ascending: false }).limit(1).single(),
      db.from('kpi_weekly_snapshots').select('*').order('week_start', { ascending: false }).limit(12),
      db.from('user_roles').select('user_id, user_profiles!inner(display_name, email)').in('role', ['sales', 'admin', 'super_admin']),
      db.from('sales_customers').select('sales_user_id, stage, created_at'),
      db.from('admin_work_logs').select('user_id').eq('action', 'customer_update').gte('created_at', weekStartISO),
      db.from('admin_work_logs').select('user_id, details').eq('action', 'customer_contact').gte('created_at', weekStartISO),
    ]);

    const kpi = kpiRes.data ?? {
      weekly_new_leads: 10,
      weekly_followups: 20,
      weekly_conversions: 2,
      monthly_revenue_target: 5000,
    };
    if (kpi.weekly_followups === undefined) kpi.weekly_followups = 20;

    const salesUsers = salesRes.data ?? [];
    const allCustomers = customersRes.data ?? [];
    const followupLogs = followupsRes.data ?? [];
    const contactLogs = contactsRes.data ?? [];

    const perSalesKpi = salesUsers.map((s: { user_id: string; user_profiles: { display_name: string; email: string } }) => {
      const thisWeekCustomers = allCustomers.filter((c: { sales_user_id: string; created_at: string }) =>
        c.sales_user_id === s.user_id && c.created_at >= weekStartISO
      );
      const thisWeekConverted = thisWeekCustomers.filter((c: { stage: string }) => c.stage === 'converted');
      const thisWeekFollowups = followupLogs.filter((f: { user_id: string }) => f.user_id === s.user_id).length;

      const userContacts = contactLogs.filter((c: { user_id: string }) => c.user_id === s.user_id);
      const contactMethodBreakdown: Record<string, number> = {};
      for (const c of userContacts) {
        const method = (c.details as Record<string, string>)?.method ?? 'other';
        contactMethodBreakdown[method] = (contactMethodBreakdown[method] ?? 0) + 1;
      }

      const totalCustomers = allCustomers.filter((c: { sales_user_id: string }) => c.sales_user_id === s.user_id);
      const totalConverted = totalCustomers.filter((c: { stage: string }) => c.stage === 'converted').length;

      return {
        userId: s.user_id,
        name: s.user_profiles.display_name || s.user_profiles.email,
        weeklyLeads: thisWeekCustomers.length,
        weeklyFollowups: thisWeekFollowups,
        weeklyConversions: thisWeekConverted.length,
        weeklyContacts: userContacts.length,
        contactMethodBreakdown,
        totalCustomers: totalCustomers.length,
        totalConverted,
        conversionRate: totalCustomers.length > 0 ? ((totalConverted / totalCustomers.length) * 100).toFixed(1) : '0.0',
        leadsTarget: kpi.weekly_new_leads,
        followupsTarget: kpi.weekly_followups,
        conversionsTarget: kpi.weekly_conversions,
        leadsMet: thisWeekCustomers.length >= kpi.weekly_new_leads,
        followupsMet: thisWeekFollowups >= kpi.weekly_followups,
        conversionsMet: thisWeekConverted.length >= kpi.weekly_conversions,
      };
    });

    return Response.json({
      kpi,
      history: (historyRes.data ?? []).reverse(),
      perSalesKpi,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/kpi GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSuperAdmin();
    const body = await req.json();

    const { data, error } = await db
      .from('kpi_settings')
      .upsert({
        id: 'global',
        weekly_new_leads: body.weekly_new_leads ?? 10,
        weekly_followups: body.weekly_followups ?? 20,
        weekly_conversions: body.weekly_conversions ?? 2,
        monthly_revenue_target: body.monthly_revenue_target ?? 5000,
        updated_by: user.id,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ kpi: data });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/kpi POST]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
