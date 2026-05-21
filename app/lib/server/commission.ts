/**
 * Sales commission calculation helpers
 * Used by Stripe webhook and cron jobs
 */
import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface CommissionResult { created: boolean; commission_id?: string; reason?: string; }

const TIER_ORDER: Record<string, number> = { standard: 0, senior: 1, partner: 2 };

async function getTierCommissionRate(agentId: string, productType: string): Promise<number> {
  const { data: agent } = await db
    .from('sales_agents').select('tier')
    .eq('id', agentId).single();
  const tier = agent?.tier || 'standard';

  const { data: tierRate } = await db
    .from('sales_tier_rates').select('commission_rate')
    .eq('product_type', productType).eq('tier', tier).maybeSingle();
  if (tierRate) return parseFloat(tierRate.commission_rate);

  const { data: defaultRate } = await db
    .from('sales_commission_rates').select('commission_rate')
    .eq('product_type', productType).maybeSingle();
  return defaultRate?.commission_rate ? parseFloat(defaultRate.commission_rate) : 0.20;
}

export async function checkAndPromoteAgent(agentId: string): Promise<void> {
  const { data: agent } = await db
    .from('sales_agents').select('id, tier, name')
    .eq('id', agentId).single();
  if (!agent) return;

  const [refsRes, commRes] = await Promise.all([
    db.from('sales_referrals').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
    db.from('sales_commissions').select('commission_amount')
      .eq('agent_id', agentId).in('status', ['confirmed', 'paid_out']),
  ]);

  const totalRegistrations = refsRes.count || 0;
  const totalCommission = (commRes.data || []).reduce((s: number, c: { commission_amount: number }) => s + Number(c.commission_amount), 0);

  const { data: rules } = await db
    .from('sales_tier_rules').select('*')
    .order('min_registrations', { ascending: false });

  let newTier = 'standard';
  for (const rule of rules || []) {
    if (totalRegistrations >= rule.min_registrations || totalCommission >= Number(rule.min_commission)) {
      newTier = rule.tier;
      break;
    }
  }

  const currentOrder = TIER_ORDER[agent.tier || 'standard'] ?? 0;
  const newOrder = TIER_ORDER[newTier] ?? 0;
  if (newOrder > currentOrder) {
    await db.from('sales_agents').update({ tier: newTier }).eq('id', agentId);
    await db.from('sales_audit_logs').insert({
      actor_id: agentId, actor_email: 'system', actor_role: 'system',
      action: 'agent_tier_promoted', target_type: 'sales_agent', target_id: agentId,
      details: { from_tier: agent.tier, to_tier: newTier, total_registrations: totalRegistrations, total_commission: totalCommission, agent_name: agent.name },
    });
  }
}

export async function tryCreateCommission(params: {
  userId: string; stripePaymentId: string; stripeInvoiceId?: string;
  stripeCheckoutSessionId?: string; productType: string; productName: string; paymentAmount: number;
}): Promise<CommissionResult> {
  const { userId, stripePaymentId, productType, productName, paymentAmount } = params;
  if (paymentAmount <= 0) return { created: false, reason: 'zero_amount' };

  const { data: referral } = await db
    .from('sales_referrals').select('id, agent_id')
    .eq('referred_user_id', userId).maybeSingle();
  if (!referral) return { created: false, reason: 'no_referral' };

  const rate = await getTierCommissionRate(referral.agent_id, productType);
  const commissionAmount = Math.round(paymentAmount * rate * 100) / 100;

  const { data: commission, error } = await db.from('sales_commissions').insert({
    agent_id: referral.agent_id, referral_id: referral.id, referred_user_id: userId,
    stripe_payment_id: stripePaymentId,
    stripe_invoice_id: params.stripeInvoiceId || null,
    stripe_checkout_session_id: params.stripeCheckoutSessionId || null,
    product_type: productType, product_name: productName,
    payment_amount: paymentAmount, commission_rate: rate, commission_amount: commissionAmount,
    status: 'pending',
  }).select('id').single();

  if (error) {
    if (error.code === '23505') return { created: false, reason: 'duplicate' };
    console.error('[commission] insert error:', error);
    return { created: false, reason: 'db_error' };
  }

  const { data: currentRef } = await db
    .from('sales_referrals').select('total_revenue, total_commission, first_purchase_at')
    .eq('id', referral.id).single();
  if (currentRef) {
    await db.from('sales_referrals').update({
      total_revenue: parseFloat(currentRef.total_revenue) + paymentAmount,
      total_commission: parseFloat(currentRef.total_commission) + commissionAmount,
      first_purchase_at: currentRef.first_purchase_at || new Date().toISOString(),
    }).eq('id', referral.id);
  }

  await db.from('sales_audit_logs').insert({
    actor_id: userId, actor_email: '', actor_role: 'system',
    action: 'commission_created', target_type: 'commission', target_id: commission.id,
    details: { product_type: productType, payment_amount: paymentAmount, commission_rate: rate, commission_amount: commissionAmount },
  });

  return { created: true, commission_id: commission.id };
}

export async function handleRefund(params: {
  stripePaymentId: string; refundAmount: number; refundEventId: string;
}): Promise<void> {
  const { stripePaymentId, refundAmount, refundEventId } = params;
  const { data: commission } = await db
    .from('sales_commissions').select('id, status, commission_amount, referral_id, agent_id')
    .eq('stripe_payment_id', stripePaymentId).maybeSingle();
  if (!commission) return;

  if (commission.status === 'pending') {
    await db.from('sales_commissions').update({
      status: 'rejected', rejection_reason: 'Stripe refund',
      refund_event_id: refundEventId, refunded_amount: refundAmount,
    }).eq('id', commission.id);
  } else if (commission.status === 'confirmed') {
    await db.from('sales_commissions').update({
      status: 'refunded', refunded_amount: refundAmount, refund_event_id: refundEventId,
    }).eq('id', commission.id);
    const { data: ref } = await db
      .from('sales_referrals').select('total_revenue, total_commission, total_refunded')
      .eq('id', commission.referral_id).single();
    if (ref) {
      await db.from('sales_referrals').update({
        total_revenue: Math.max(0, parseFloat(ref.total_revenue) - refundAmount),
        total_commission: Math.max(0, parseFloat(ref.total_commission) - parseFloat(commission.commission_amount)),
        total_refunded: parseFloat(ref.total_refunded) + refundAmount,
      }).eq('id', commission.referral_id);
    }
  }

  await db.from('sales_audit_logs').insert({
    actor_id: commission.agent_id, actor_email: '', actor_role: 'system',
    action: 'commission_refunded', target_type: 'commission', target_id: commission.id,
    details: { original_status: commission.status, refund_amount: refundAmount, refund_event_id: refundEventId },
  });
}
