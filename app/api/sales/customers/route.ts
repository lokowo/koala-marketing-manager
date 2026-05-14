import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { logWork } from '../../../lib/worklog';
import { notifySalesConversion } from '../../../lib/server/slack';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || !['super_admin', 'admin', 'sales'].includes(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const stage = sp.get('stage');
    const search = sp.get('search');
    const sort = sp.get('sort') || 'created_at';
    const qrCode = sp.get('qr_code');

    // 1. Registered customers
    const { data: registered } = await db
      .from('sales_customers')
      .select('id, stage, source, source_channel, source_code, last_contacted_at, contact_count, notes, created_at, customer_user_id, user_profiles!customer_user_id(id, display_name, email, phone, avatar_url, credit_balance, created_at)')
      .eq('sales_user_id', user.id)
      .order('created_at', { ascending: false });

    // 2. Unregistered survey leads
    const { data: unregistered } = await db
      .from('survey_responses')
      .select('id, respondent_name, respondent_phone, respondent_email, respondent_wechat, follow_up_status, follow_up_notes, value_score, completed_at, metadata, survey_id, surveys!survey_id(title_zh)')
      .eq('sales_user_id', user.id)
      .eq('status', 'completed')
      .is('registered_user_id', null)
      .order('completed_at', { ascending: false });

    // Map follow_up_status to stage
    const statusToStage: Record<string, string> = {
      pending: 'lead', contacted: 'contacted', converted: 'converted', lost: 'lost',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type AnyRow = any;

    const allClients = [
      ...(registered ?? []).map((r: AnyRow) => ({
        id: r.id,
        type: 'registered' as const,
        name: r.user_profiles?.display_name || '未知',
        phone: r.user_profiles?.phone || '',
        email: r.user_profiles?.email || '',
        wechat: '',
        stage: r.stage || 'lead',
        source: r.source || 'direct',
        source_channel: r.source_channel || '',
        registered: true,
        value_score: null as number | null,
        survey_title: '',
        last_contacted_at: r.last_contacted_at,
        contact_count: r.contact_count || 0,
        notes: r.notes || '',
        created_at: r.created_at,
        customer_user_id: r.customer_user_id,
        email_status: null as string | null,
      })),
      ...(unregistered ?? []).map((u: AnyRow) => ({
        id: u.id,
        type: 'survey_lead' as const,
        name: u.respondent_name || '未知',
        phone: u.respondent_phone || '',
        email: u.respondent_email || '',
        wechat: u.respondent_wechat || '',
        stage: statusToStage[u.follow_up_status] || 'lead',
        source: 'survey',
        source_channel: 'survey',
        registered: false,
        value_score: u.value_score as number | null,
        survey_title: u.surveys?.title_zh || '',
        last_contacted_at: null,
        contact_count: 0,
        notes: u.follow_up_notes || '',
        created_at: u.completed_at,
        customer_user_id: null,
        email_status: (u.metadata as Record<string, unknown>)?.email_status as string || null,
      })),
    ];

    // Filter by stage
    let filtered = stage ? allClients.filter(c => c.stage === stage) : allClients;

    // Filter by QR code
    if (qrCode) {
      const matchIds = new Set<string>();
      const { data: shareLink } = await db.from('survey_share_links')
        .select('id').eq('short_code', qrCode).single();
      if (shareLink) {
        const { data: responses } = await db.from('survey_responses')
          .select('id, registered_user_id')
          .eq('share_link_id', shareLink.id);
        for (const r of responses ?? []) {
          if (r.registered_user_id) matchIds.add(r.registered_user_id);
          matchIds.add(r.id);
        }
      }
      const { data: noteMatches } = await db.from('sales_customers')
        .select('id, customer_user_id')
        .eq('sales_user_id', user.id)
        .ilike('notes', `%${qrCode}%`);
      for (const m of noteMatches ?? []) { matchIds.add(m.id); if (m.customer_user_id) matchIds.add(m.customer_user_id); }

      filtered = filtered.filter(c => matchIds.has(c.id) || (c.customer_user_id && matchIds.has(c.customer_user_id)));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sort === 'value_score') {
      filtered.sort((a, b) => (b.value_score ?? 0) - (a.value_score ?? 0));
    } else if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    }
    // default: already sorted by created_at desc

    return Response.json({ data: filtered, total: filtered.length });
  } catch (e) {
    console.error('[sales/customers GET]', e);
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

    const { customerId, stage, note } = await req.json();
    if (!customerId) return Response.json({ error: 'customerId required' }, { status: 400 });

    const { data: prev } = await db
      .from('sales_customers')
      .select('stage')
      .eq('id', customerId)
      .eq('sales_user_id', user.id)
      .single();

    const { data, error } = await db
      .from('sales_customers')
      .update({ stage, note, updated_at: new Date().toISOString() })
      .eq('id', customerId)
      .eq('sales_user_id', user.id)
      .select('*, user_profiles(display_name, email)')
      .single();

    if (error) throw error;
    if (!data) return Response.json({ error: 'Not found' }, { status: 404 });

    if (prev && prev.stage !== stage) {
      const { data: salesProfile } = await db.from('user_profiles').select('display_name').eq('id', user.id).single();
      notifySalesConversion({
        salesName: salesProfile?.display_name || user.email || 'Sales',
        customerName: data.user_profiles?.display_name || data.user_profiles?.email || customerId,
        fromStage: prev.stage,
        toStage: stage,
      });
    }

    await logWork({
      userId: user.id,
      role: 'sales',
      action: 'customer_update',
      actionCategory: 'sales_customer',
      targetType: 'sales_customer',
      targetId: customerId,
      targetName: data.user_profiles?.display_name || data.user_profiles?.email || undefined,
      details: { stage, note: note?.slice(0, 50) },
    });

    return Response.json({ data });
  } catch (e) {
    console.error('[sales/customers POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
