import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await db
      .from('sales_weekly_reports')
      .select('*')
      .eq('sales_user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(12);

    if (error) throw error;
    return Response.json({ data: data ?? [] });
  } catch (e) {
    console.error('[sales/weekly-report GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { weekStart, summary, highlights, challenges, nextWeekPlan } = await req.json();
    if (!weekStart) return Response.json({ error: 'weekStart required' }, { status: 400 });

    const { data, error } = await db
      .from('sales_weekly_reports')
      .upsert({
        sales_user_id: user.id,
        week_start: weekStart,
        summary: summary || '',
        highlights: highlights || [],
        challenges: challenges || [],
        next_week_plan: nextWeekPlan || '',
      }, { onConflict: 'sales_user_id,week_start' })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error('[sales/weekly-report POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
