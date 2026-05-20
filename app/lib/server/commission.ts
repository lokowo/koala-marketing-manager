/**
 * Sales commission calculation helpers
 * Used by Stripe webhook and cron jobs
 */
import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface CommissionResult { created: boolean; commission_id?: string; reason?: string; }

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

  const { data: rateConfig } = await db
    .from('sales_commission_rates').select('commission_rate')
    .eq('product_type', productType).maybeSingle();

  const rate = rateConfig?.commission_rate ? parseFloat(rateConfig.commission_rate) : 0.20;
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
