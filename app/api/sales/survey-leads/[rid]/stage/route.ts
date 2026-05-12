import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase/server';
import { logWork } from '../../../../../lib/worklog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const STATUS_MAP: Record<string, string> = {
  lead: 'pending',
  contacted: 'contacted',
  interested: 'contacted',
  converted: 'converted',
  lost: 'lost',
};

const STAGE_LABELS: Record<string, string> = {
  lead: '线索', contacted: '已联系', interested: '有意向',
  converted: '已转化', lost: '已流失',
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ rid: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rid } = await params;
    const { stage, notes } = await req.json();

    if (!stage || !STATUS_MAP[stage]) {
      return Response.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const { data: response, error: fetchErr } = await db
      .from('survey_responses')
      .select('id, sales_user_id, respondent_name, respondent_email, follow_up_status')
      .eq('id', rid)
      .eq('sales_user_id', user.id)
      .single();

    if (fetchErr || !response) {
      return Response.json({ error: '线索不存在' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      follow_up_status: STATUS_MAP[stage],
    };
    if (notes !== undefined) {
      updateData.follow_up_notes = notes;
    }

    const { error: updateErr } = await db
      .from('survey_responses')
      .update(updateData)
      .eq('id', rid);

    if (updateErr) throw updateErr;

    const name = response.respondent_name || response.respondent_email || rid;
    await logWork({
      userId: user.id,
      role: 'sales',
      action: 'customer_stage_change',
      actionCategory: 'sales_customer',
      targetType: 'survey_lead',
      targetId: rid,
      targetName: name,
      details: { old_stage: response.follow_up_status, new_stage: stage },
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error('[sales/survey-leads/[rid]/stage PUT]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
