import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(lastMonday.getDate() - lastMonday.getDay() - 6);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const weekStartISO = lastMonday.toISOString();
    const weekEndISO = lastSunday.toISOString();
    const weekLabel = lastMonday.toISOString().slice(0, 10);

    const [salesRes, customersRes, qrcodesRes] = await Promise.all([
      db.from('user_roles').select('user_id').in('role', ['sales', 'admin']),
      db.from('sales_customers').select('sales_user_id, stage, created_at')
        .gte('created_at', weekStartISO).lte('created_at', weekEndISO),
      db.from('sales_qrcodes').select('sales_user_id, scan_count'),
    ]);

    const salesUsers = salesRes.data ?? [];
    const customers = customersRes.data ?? [];

    let totalLeads = 0;
    let totalConversions = 0;

    for (const su of salesUsers) {
      const myCustomers = customers.filter((c: { sales_user_id: string }) => c.sales_user_id === su.user_id);
      const newLeads = myCustomers.length;
      const converted = myCustomers.filter((c: { stage: string }) => c.stage === 'converted').length;
      const myScans = (qrcodesRes.data ?? [])
        .filter((q: { sales_user_id: string }) => q.sales_user_id === su.user_id)
        .reduce((sum: number, q: { scan_count: number }) => sum + (q.scan_count || 0), 0);

      totalLeads += newLeads;
      totalConversions += converted;

      await db.from('sales_weekly_reports').upsert({
        sales_user_id: su.user_id,
        week_start: weekLabel,
        summary: `本周新增 ${newLeads} 个线索，转化 ${converted} 个，推广码累计扫描 ${myScans} 次`,
        highlights: [],
        challenges: [],
        next_week_plan: '',
        auto_generated: true,
        new_leads: newLeads,
        conversions: converted,
        scans: myScans,
      }, { onConflict: 'sales_user_id,week_start' });

      await db.from('notifications').insert({
        user_id: su.user_id,
        type: 'weekly_report',
        title: '上周周报已生成',
        body: `本周新增 ${newLeads} 个线索，转化 ${converted} 个。查看详情请前往 Sales Dashboard。`,
      });
    }

    await db.from('kpi_weekly_snapshots').upsert({
      week_start: weekLabel,
      total_leads: totalLeads,
      total_conversions: totalConversions,
      sales_count: salesUsers.length,
    }, { onConflict: 'week_start' });

    return Response.json({
      success: true,
      weekStart: weekLabel,
      salesProcessed: salesUsers.length,
      totalLeads,
      totalConversions,
    });
  } catch (e) {
    console.error('[cron/weekly-sales-report]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
