import { requireAdmin, getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'confirmed';
    const agentId = searchParams.get('agent_id');

    let query = db
      .from('sales_commissions')
      .select('*, sales_agents(user_id, referral_code, payment_method, payment_account, payment_name, user_profiles:user_id(display_name, email)), sales_referrals(referred_user_id, user_profiles:referred_user_id(display_name, email))')
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);
    if (agentId) query = query.eq('agent_id', agentId);

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map((c: any) => ({
      id: c.id,
      agent_name: c.sales_agents?.user_profiles?.display_name || c.sales_agents?.user_profiles?.email || c.sales_agents?.referral_code,
      agent_email: c.sales_agents?.user_profiles?.email || '',
      agent_payment_method: c.sales_agents?.payment_method || null,
      agent_payment_account: c.sales_agents?.payment_account || null,
      agent_payment_name: c.sales_agents?.payment_name || null,
      user_name: c.sales_referrals?.user_profiles?.display_name || c.sales_referrals?.user_profiles?.email || '未知',
      user_email: c.sales_referrals?.user_profiles?.email || '',
      product_type: c.product_type,
      product_name: c.product_name,
      payment_amount: c.payment_amount,
      commission_rate: c.commission_rate,
      commission_amount: c.commission_amount,
      refunded_amount: c.refunded_amount,
      status: c.status,
      created_at: c.created_at,
      confirmed_at: c.confirmed_at,
      confirmation_method: c.confirmation_method,
      paid_out_at: c.paid_out_at,
      payout_reference: c.payout_reference,
      payout_method: c.payout_method,
      payout_note: c.payout_note,
      stripe_payment_id: c.stripe_payment_id,
      stripe_invoice_id: c.stripe_invoice_id,
      rejection_reason: c.rejection_reason,
    }));

    const pendingTotal = items.filter((c: any) => c.status === 'confirmed').reduce((s: number, c: any) => s + c.commission_amount, 0);

    return Response.json({ data: items, pendingTotal: Math.round(pendingTotal * 100) / 100 });
  } catch (error) {
    console.error('[admin/commission-payout GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result || !['admin', 'super_admin'].includes(result.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commission_ids, payout_reference, payout_method, payout_note } = await req.json();
    if (!commission_ids?.length) {
      return Response.json({ error: 'No commission IDs provided' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: 'paid_out',
      paid_out_at: now,
      paid_out_by: result.user.id,
    };
    if (payout_reference) updatePayload.payout_reference = payout_reference;
    if (payout_method) updatePayload.payout_method = payout_method;
    if (payout_note) updatePayload.payout_note = payout_note;

    const { error } = await db
      .from('sales_commissions')
      .update(updatePayload)
      .in('id', commission_ids)
      .eq('status', 'confirmed');

    if (error) throw error;

    await db.from('sales_audit_logs').insert({
      actor_id: result.user.id,
      actor_email: result.user.email || '',
      actor_role: result.role,
      action: 'commission_batch_payout',
      target_type: 'commission',
      details: { commission_ids, count: commission_ids.length, paid_out_at: now, payout_reference, payout_method },
    });

    return Response.json({ ok: true, count: commission_ids.length });
  } catch (error) {
    console.error('[admin/commission-payout POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result || !['admin', 'super_admin'].includes(result.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { commission_id } = await req.json();
    if (!commission_id) {
      return Response.json({ error: 'Missing commission_id' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from('sales_commissions')
      .update({
        status: 'confirmed',
        confirmed_at: now,
        confirmed_by: result.user.id,
        confirmation_method: 'manual_admin',
      })
      .eq('id', commission_id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return Response.json({ error: 'Commission not found or not pending' }, { status: 404 });
    }

    await db.from('sales_audit_logs').insert({
      actor_id: result.user.id,
      actor_email: result.user.email || '',
      actor_role: result.role,
      action: 'commission_manual_confirmed',
      target_type: 'commission',
      target_id: commission_id,
      details: { commission_amount: data.commission_amount, method: 'manual_admin' },
    });

    return Response.json({ ok: true, data });
  } catch (error) {
    console.error('[admin/commission-payout PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
