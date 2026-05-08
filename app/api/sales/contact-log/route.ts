import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { logWork } from '../../../lib/worklog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CONTACT_METHODS = ['wechat', 'phone', 'email', 'meeting', 'other'] as const;

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { customerId, method, summary, outcome, nextFollowup } = await req.json();
    if (!customerId) return Response.json({ error: 'customerId required' }, { status: 400 });
    if (!method || !CONTACT_METHODS.includes(method)) {
      return Response.json({ error: `method must be one of: ${CONTACT_METHODS.join(', ')}` }, { status: 400 });
    }

    const { data: customer } = await db
      .from('sales_customers')
      .select('id, customer_user_id, user_profiles(display_name, email)')
      .eq('id', customerId)
      .eq('sales_user_id', user.id)
      .single();

    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

    if (customer.stage === 'lead') {
      await db
        .from('sales_customers')
        .update({ stage: 'contacted', updated_at: new Date().toISOString() })
        .eq('id', customerId);
    }

    await logWork({
      userId: user.id,
      role: 'sales',
      action: 'customer_contact',
      actionCategory: 'sales_contact',
      targetType: 'sales_customer',
      targetId: customerId,
      targetName: customer.user_profiles?.display_name || customer.user_profiles?.email || undefined,
      details: {
        method,
        summary: summary?.slice(0, 500),
        outcome: outcome?.slice(0, 200),
        next_followup: nextFollowup || null,
      },
    });

    return Response.json({ success: true });
  } catch (e) {
    console.error('[sales/contact-log POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const customerId = sp.get('customerId');
    const weekOnly = sp.get('weekOnly') === 'true';

    let query = db
      .from('admin_work_logs')
      .select('*')
      .eq('action', 'customer_contact')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('target_id', customerId);
    }

    if (weekOnly) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      if (weekStart > new Date()) weekStart.setDate(weekStart.getDate() - 7);
      query = query.gte('created_at', weekStart.toISOString());
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;

    const methodBreakdown: Record<string, number> = {};
    for (const log of data ?? []) {
      const m = (log.details as Record<string, string>)?.method ?? 'other';
      methodBreakdown[m] = (methodBreakdown[m] ?? 0) + 1;
    }

    return Response.json({
      contacts: data ?? [],
      total: (data ?? []).length,
      methodBreakdown,
    });
  } catch (e) {
    console.error('[sales/contact-log GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
