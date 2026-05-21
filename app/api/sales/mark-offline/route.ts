import { getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PATCH(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: agent } = await db
      .from('sales_agents').select('id')
      .eq('user_id', result.user.id).eq('status', 'active').single();
    if (!agent) return Response.json({ error: 'Not a sales agent' }, { status: 403 });

    const { referral_id, notes } = await req.json();
    if (!referral_id) return Response.json({ error: 'Missing referral_id' }, { status: 400 });

    const { data: referral } = await db
      .from('sales_referrals').select('id, offline_converted')
      .eq('id', referral_id).eq('agent_id', agent.id).single();
    if (!referral) return Response.json({ error: 'Referral not found' }, { status: 404 });
    if (referral.offline_converted) return Response.json({ error: 'Already converted' }, { status: 409 });

    await db.from('sales_referrals').update({
      offline_converted: true,
      offline_converted_at: new Date().toISOString(),
      offline_notes: notes || null,
    }).eq('id', referral_id);

    await db.from('sales_audit_logs').insert({
      actor_id: result.user.id,
      actor_email: result.user.email || '',
      actor_role: 'sales',
      action: 'referral_offline_converted',
      target_type: 'referral',
      target_id: referral_id,
      details: { notes: notes || null },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[sales/mark-offline]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
