import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');
    const period = searchParams.get('period');

    let query = db
      .from('sales_kpi_targets')
      .select('*, sales_agents!inner(user_id, referral_code, user_profiles:user_id(display_name, email))')
      .order('effective_from', { ascending: false });

    if (agentId) query = query.eq('agent_id', agentId);
    if (period) {
      query = query.lte('effective_from', period).gte('effective_until', period);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ data: data || [] });
  } catch (error) {
    console.error('[admin/kpi-targets GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { agent_ids, effective_from, effective_until, kpi_1_visits, kpi_2_registrations, kpi_3_payments, kpi_3_revenue, kpi_4_offline } = body;

    if (!agent_ids?.length || !effective_from || !effective_until) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const records = agent_ids.map((agentId: string) => ({
      agent_id: agentId,
      effective_from,
      effective_until,
      period_type: 'monthly',
      kpi_1_visits: kpi_1_visits || 0,
      kpi_2_registrations: kpi_2_registrations || 0,
      kpi_3_payments: kpi_3_payments || 0,
      kpi_3_revenue: kpi_3_revenue || 0,
      kpi_4_offline: kpi_4_offline || 0,
    }));

    const { data, error } = await db
      .from('sales_kpi_targets')
      .upsert(records, { onConflict: 'agent_id,effective_from', ignoreDuplicates: false })
      .select();

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    console.error('[admin/kpi-targets POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { id, ...updates } = await req.json();

    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const allowed = ['kpi_1_visits', 'kpi_2_registrations', 'kpi_3_payments', 'kpi_3_revenue', 'kpi_4_offline'];
    const filtered: Record<string, number> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = Number(updates[key]);
    }

    const { data, error } = await db
      .from('sales_kpi_targets')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    console.error('[admin/kpi-targets PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
