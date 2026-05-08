import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const STAGES = ['lead', 'contacted', 'interested', 'trial', 'converted', 'churned'] as const;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await db
      .from('sales_customers')
      .select('stage')
      .eq('sales_user_id', user.id);

    if (error) throw error;

    const funnel: Record<string, number> = {};
    for (const s of STAGES) funnel[s] = 0;
    for (const row of data ?? []) {
      if (row.stage && funnel[row.stage] !== undefined) {
        funnel[row.stage]++;
      }
    }

    const total = (data ?? []).length;

    return Response.json({
      funnel,
      total,
      conversionRate: total > 0 ? ((funnel.converted / total) * 100).toFixed(1) : '0.0',
    });
  } catch (e) {
    console.error('[sales/funnel GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
