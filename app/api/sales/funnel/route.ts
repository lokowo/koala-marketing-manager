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

    let funnelData: Record<string, number> | null = null;
    let lost = 0;

    try {
      const { data } = await db.rpc('get_sales_funnel', { p_sales_user_id: user.id });
      if (data) {
        funnelData = {
          lead: (data.registered_lead || 0),
          contacted: data.contacted || 0,
          interested: data.interested || 0,
          trial: data.trial || 0,
          converted: data.converted || 0,
        };
        lost = data.lost || 0;
      }
    } catch {
      // RPC not available, fall back
    }

    if (!funnelData) {
      const { data: custData } = await db
        .from('sales_customers')
        .select('stage')
        .eq('sales_user_id', user.id);

      const stages: Record<string, number> = { lead: 0, contacted: 0, interested: 0, trial: 0, converted: 0 };
      for (const row of custData ?? []) {
        if (row.stage === 'lost' || row.stage === 'churned') { lost++; continue; }
        if (row.stage && stages[row.stage] !== undefined) stages[row.stage]++;
      }
      funnelData = stages;
    }

    // Unregistered survey leads — distribute by follow_up_status into correct funnel stages
    const { data: surveyLeads } = await db
      .from('survey_responses')
      .select('follow_up_status')
      .eq('sales_user_id', user.id)
      .eq('status', 'completed')
      .is('registered_user_id', null);

    const statusToStage: Record<string, string> = {
      pending: 'lead', contacted: 'contacted', converted: 'converted',
    };
    for (const row of surveyLeads ?? []) {
      if (row.follow_up_status === 'lost') { lost++; continue; }
      const stage = statusToStage[row.follow_up_status] || 'lead';
      if (funnelData[stage] !== undefined) funnelData[stage]++;
      else funnelData.lead++;
    }

    const totalInFunnel = Object.values(funnelData).reduce((s, n) => s + n, 0);

    const conversionRate = totalInFunnel > 0
      ? ((funnelData.converted / totalInFunnel) * 100).toFixed(1)
      : '0.0';

    return Response.json({
      funnel: funnelData,
      total: totalInFunnel,
      conversionRate,
      lost,
    });
  } catch (e) {
    console.error('[sales/funnel GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
