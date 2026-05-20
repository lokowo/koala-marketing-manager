import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pending, error: fetchError } = await db
      .from('sales_commissions').select('id, agent_id, referral_id, commission_amount, refunded_amount')
      .eq('status', 'pending').lt('created_at', thirtyDaysAgo);
    if (fetchError) { console.error('[cron]', fetchError); return NextResponse.json({ error: 'DB error' }, { status: 500 }); }
    if (!pending?.length) return NextResponse.json({ confirmed: 0, total_amount: 0 });

    let count = 0, total = 0;
    for (const c of pending) {
      if (parseFloat(c.refunded_amount) > 0) continue;
      const { error } = await db.from('sales_commissions').update({
        status: 'confirmed', confirmed_at: new Date().toISOString(), confirmation_method: 'auto_t30',
      }).eq('id', c.id).eq('status', 'pending');
      if (error) { console.error('[cron]', c.id, error); continue; }
      count++; total += parseFloat(c.commission_amount);
      await db.from('sales_audit_logs').insert({
        actor_id: c.agent_id, actor_email: '', actor_role: 'system',
        action: 'commission_auto_confirmed', target_type: 'commission', target_id: c.id,
        details: { commission_amount: c.commission_amount, method: 'auto_t30' },
      });
    }
    console.log(`[cron] Auto-confirmed ${count} commissions, total AUD ${total.toFixed(2)}`);
    return NextResponse.json({ confirmed: count, total_amount: Math.round(total * 100) / 100, skipped: pending.length - count });
  } catch (error) {
    console.error('[cron]', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
