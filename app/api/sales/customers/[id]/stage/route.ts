import { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase/server';
import { logWork } from '../../../../../lib/worklog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const STAGE_LABELS: Record<string, string> = {
  lead: '线索', contacted: '已联系', interested: '有意向',
  trial: '试用中', converted: '已转化', lost: '已流失',
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: customerId } = await params;
    const { stage, notes } = await req.json();

    if (!stage || !STAGE_LABELS[stage]) {
      return Response.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const { data: customer, error: fetchErr } = await db
      .from('sales_customers')
      .select('*')
      .eq('id', customerId)
      .eq('sales_user_id', user.id)
      .single();

    if (fetchErr || !customer) {
      return Response.json({ error: '客户不存在' }, { status: 404 });
    }

    const oldStage = customer.stage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { stage, updated_at: new Date().toISOString() };

    if (stage === 'contacted') {
      updateData.last_contacted_at = new Date().toISOString();
      updateData.contact_count = (customer.contact_count || 0) + 1;
    }

    if (stage === 'converted' && !customer.first_purchase_at) {
      updateData.first_purchase_at = new Date().toISOString();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { error: updateErr } = await db
      .from('sales_customers')
      .update(updateData)
      .eq('id', customerId);

    if (updateErr) throw updateErr;

    const customerName = customer.user_profiles?.display_name
      || customer.user_profiles?.email
      || customerId;

    await logWork({
      userId: user.id,
      role: 'sales',
      action: 'customer_stage_change',
      actionCategory: 'sales_customer',
      targetType: 'sales_customer',
      targetId: customerId,
      targetName: customerName,
      details: { old_stage: oldStage, new_stage: stage },
    });

    return Response.json({ success: true, old_stage: oldStage, new_stage: stage });
  } catch (e) {
    console.error('[sales/customers/[id]/stage PUT]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
