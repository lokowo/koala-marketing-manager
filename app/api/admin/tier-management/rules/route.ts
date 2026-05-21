import { getServerUserWithRole } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PATCH(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result || result.role !== 'super_admin') {
      return Response.json({ error: 'Only super_admin can modify tier rules' }, { status: 403 });
    }

    const { tier, min_commission } = await req.json();
    if (!tier) {
      return Response.json({ error: 'Missing tier' }, { status: 400 });
    }

    const commission = parseFloat(min_commission) || 0;

    const { error } = await db
      .from('sales_tier_rules')
      .update({
        min_commission: commission,
        updated_at: new Date().toISOString(),
        updated_by: result.user.id,
      })
      .eq('tier', tier);

    if (error) throw error;

    await db.from('sales_audit_logs').insert({
      actor_id: result.user.id,
      actor_email: result.user.email || '',
      actor_role: result.role,
      action: 'tier_rule_updated',
      target_type: 'sales_tier_rules',
      details: { tier, min_commission: commission },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[admin/tier-management/rules PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
