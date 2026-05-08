import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireSuperAdmin();

    const [salesUsersRes, customersRes, qrcodesRes, reportsRes] = await Promise.all([
      db.from('user_roles').select('user_id, role, user_profiles(display_name, email, avatar_url)').in('role', ['sales', 'admin', 'super_admin']),
      db.from('sales_customers').select('sales_user_id, stage, created_at'),
      db.from('sales_qrcodes').select('sales_user_id, code, scan_count, created_at'),
      db.from('sales_weekly_reports').select('sales_user_id, week_start, summary').order('week_start', { ascending: false }).limit(50),
    ]);

    const salesUsers = salesUsersRes.data ?? [];
    const allCustomers = customersRes.data ?? [];
    const allQrcodes = qrcodesRes.data ?? [];

    const perSales = salesUsers.map((su: { user_id: string; user_profiles: { display_name: string; email: string; avatar_url: string } }) => {
      const customers = allCustomers.filter((c: { sales_user_id: string }) => c.sales_user_id === su.user_id);
      const qrcodes = allQrcodes.filter((q: { sales_user_id: string }) => q.sales_user_id === su.user_id);
      const converted = customers.filter((c: { stage: string }) => c.stage === 'converted').length;

      return {
        userId: su.user_id,
        profile: su.user_profiles,
        totalCustomers: customers.length,
        converted,
        conversionRate: customers.length > 0 ? ((converted / customers.length) * 100).toFixed(1) : '0.0',
        qrcodeCount: qrcodes.length,
        totalScans: qrcodes.reduce((sum: number, q: { scan_count: number }) => sum + (q.scan_count || 0), 0),
      };
    });

    const totalCustomers = allCustomers.length;
    const totalConverted = allCustomers.filter((c: { stage: string }) => c.stage === 'converted').length;

    return Response.json({
      summary: {
        totalSalesUsers: salesUsers.length,
        totalCustomers,
        totalConverted,
        overallConversionRate: totalCustomers > 0 ? ((totalConverted / totalCustomers) * 100).toFixed(1) : '0.0',
        totalQrcodes: allQrcodes.length,
      },
      perSales,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/sales-overview GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
