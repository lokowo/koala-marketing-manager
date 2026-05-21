import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();

    const [ratesRes, rulesRes, countsRes] = await Promise.all([
      db.from('sales_tier_rates').select('*').order('product_type').order('tier'),
      db.from('sales_tier_rules').select('*').order('min_commission', { ascending: true }),
      db.from('sales_agents').select('tier').eq('status', 'active'),
    ]);

    if (ratesRes.error) throw ratesRes.error;
    if (rulesRes.error) throw rulesRes.error;

    // Group rates by product_type
    const ratesByProduct: Record<string, Record<string, unknown>> = {};
    for (const r of ratesRes.data || []) {
      if (!ratesByProduct[r.product_type]) {
        ratesByProduct[r.product_type] = { product_type: r.product_type, product_name: r.product_name };
      }
      ratesByProduct[r.product_type][`${r.tier}_rate`] = parseFloat(r.commission_rate);
    }

    const counts = { standard: 0, senior: 0, partner: 0 };
    for (const a of countsRes.data || []) {
      const t = a.tier || 'standard';
      if (t in counts) counts[t as keyof typeof counts]++;
    }

    return Response.json({
      rates: Object.values(ratesByProduct),
      rules: rulesRes.data || [],
      counts,
    });
  } catch (error) {
    console.error('[admin/tier-management GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
