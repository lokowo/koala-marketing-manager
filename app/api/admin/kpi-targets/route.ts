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
      .order('period_start', { ascending: false });

    if (agentId) query = query.eq('agent_id', agentId);
    if (period) {
      query = query.lte('period_start', period).gte('period_end', period);
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
    const { agent_ids, period_start, period_end, target_visits, target_registrations, target_conversions, target_revenue } = body;

    if (!agent_ids?.length || !period_start || !period_end) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const records = agent_ids.map((agentId: string) => ({
      agent_id: agentId,
      period_start,
      period_end,
      target_visits: target_visits || 0,
      target_registrations: target_registrations || 0,
      target_conversions: target_conversions || 0,
      target_revenue: target_revenue || 0,
    }));

    const { data, error } = await db
      .from('sales_kpi_targets')
      .upsert(records, { onConflict: 'agent_id,period_start', ignoreDuplicates: false })
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

    const allowed = ['target_visits', 'target_registrations', 'target_conversions', 'target_revenue'];
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
