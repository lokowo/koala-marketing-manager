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

    const { data: allRates } = await db
      .from('sales_tier_rates')
      .select('tier, commission_rate')
      .eq('product_type', product_type);

    const rateMap: Record<string, number> = {};
    for (const r of allRates || []) {
      rateMap[r.tier] = parseFloat(r.commission_rate);
    }
    rateMap[tier] = rate;

    const std = rateMap['standard'] ?? 0;
    const sen = rateMap['senior'] ?? 0;
    const par = rateMap['partner'] ?? 0;

    if (std >= sen) {
      return Response.json({
        error: `Standard(${(std * 100).toFixed(1)}%) 必须小于 Senior(${(sen * 100).toFixed(1)}%)`,
      }, { status: 400 });
    }
    if (sen >= par) {
      return Response.json({
        error: `Senior(${(sen * 100).toFixed(1)}%) 必须小于 Partner(${(par * 100).toFixed(1)}%)`,
      }, { status: 400 });
    }

    const { error } = await db
      .from('sales_tier_rates')
      .update({ commission_rate: rate, updated_at: new Date().toISOString(), updated_by: result.user.id })
      .eq('product_type', product_type)
      .eq('tier', tier);

    if (error) throw error;

    if (tier === 'standard') {
      await db
        .from('sales_commission_rates')
        .update({ commission_rate: rate, updated_at: new Date().toISOString(), updated_by: result.user.id })
        .eq('product_type', product_type);
    }

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
