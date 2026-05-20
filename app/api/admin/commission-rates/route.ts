import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await db
      .from('sales_commission_rates')
      .select('*')
      .order('product_type');

    if (error) throw error;
    return Response.json({ data: data || [] });
  } catch (error) {
    console.error('[admin/commission-rates GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { product_type, commission_rate } = await req.json();

    if (!product_type || commission_rate === undefined) {
      return Response.json({ error: 'Missing product_type or commission_rate' }, { status: 400 });
    }

    const { data: existing } = await db
      .from('sales_commission_rates')
      .select('min_rate, max_rate')
      .eq('product_type', product_type)
      .single();

    if (!existing) {
      return Response.json({ error: 'Product type not found' }, { status: 404 });
    }

    const rate = parseFloat(commission_rate);
    if (rate < existing.min_rate || rate > existing.max_rate) {
      return Response.json({
        error: `佣金比例必须在 ${(existing.min_rate * 100).toFixed(0)}% ~ ${(existing.max_rate * 100).toFixed(0)}% 之间`,
      }, { status: 400 });
    }

    const { data, error } = await db
      .from('sales_commission_rates')
      .update({ commission_rate: rate })
      .eq('product_type', product_type)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    console.error('[admin/commission-rates PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
