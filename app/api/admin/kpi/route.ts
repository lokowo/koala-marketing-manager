import type { NextRequest } from 'next/server';
import { requireSuperAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireSuperAdmin();

    const { data, error } = await db
      .from('kpi_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return Response.json({
      kpi: data ?? {
        weekly_new_leads: 10,
        weekly_conversions: 2,
        monthly_revenue_target: 5000,
      },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/kpi GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireSuperAdmin();
    const body = await req.json();

    const { data, error } = await db
      .from('kpi_settings')
      .upsert({
        id: 'global',
        weekly_new_leads: body.weekly_new_leads ?? 10,
        weekly_conversions: body.weekly_conversions ?? 2,
        monthly_revenue_target: body.monthly_revenue_target ?? 5000,
        updated_by: user.id,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ kpi: data });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/kpi POST]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
