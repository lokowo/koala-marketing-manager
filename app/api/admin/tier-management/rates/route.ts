import { getServerUserWithRole } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PATCH(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result || result.role !== 'super_admin') {
      return Response.json({ error: 'Only super_admin can modify tier rates' }, { status: 403 });
    }

    const { product_type, tier, commission_rate } = await req.json();
    if (!product_type || !tier || commission_rate === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rate = parseFloat(commission_rate);
    if (isNaN(rate) || rate < 0.01 || rate > 0.50) {
      return Response.json({ error: '佣金比例必须在 1% ~ 50% 之间' }, { status: 400 });
    }

    const { error } = await db
      .from('sales_tier_rates')
      .update({ commission_rate: rate, updated_at: new Date().toISOString(), updated_by: result.user.id })
      .eq('product_type', product_type)
      .eq('tier', tier);

    if (error) throw error;

    await db.from('sales_audit_logs').insert({
      actor_id: result.user.id,
      actor_email: result.user.email || '',
      actor_role: result.role,
      action: 'tier_rate_updated',
      target_type: 'sales_tier_rates',
      details: { product_type, tier, commission_rate: rate },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[admin/tier-management/rates PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
