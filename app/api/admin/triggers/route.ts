import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole, requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type TriggerRow = {
  id: string;
  trigger_key: string;
  page: string;
  condition: Record<string, unknown>;
  ola_state: string;
  message_zh: string;
  message_en: string;
  action_type: string | null;
  action_payload: Record<string, unknown> | null;
  frequency_limit: string | null;
  priority: number;
  enabled: boolean;
  created_at: string;
};

type LogRow = {
  trigger_id: string;
  shown_at: string;
  clicked: boolean;
  dismissed: boolean;
};

const EDITABLE_FIELDS = [
  'trigger_key',
  'page',
  'condition',
  'ola_state',
  'message_zh',
  'message_en',
  'action_type',
  'action_payload',
  'frequency_limit',
  'priority',
  'enabled',
] as const;

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    const msg = (e as Error).message;
    return Response.json({ error: msg === 'Unauthorized' ? 'Unauthorized' : 'Forbidden' }, { status: msg === 'Unauthorized' ? 401 : 403 });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [triggersRes, logsRes, recent7dRes] = await Promise.all([
      db
        .from('ola_triggers')
        .select('id, trigger_key, page, condition, ola_state, message_zh, message_en, action_type, action_payload, frequency_limit, priority, enabled, created_at')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false }),
      db
        .from('ola_trigger_logs')
        .select('trigger_id, shown_at, clicked, dismissed')
        .limit(50000),
      db
        .from('ola_trigger_logs')
        .select('id', { count: 'exact', head: true })
        .gte('shown_at', sevenDaysAgo),
    ]);

    const triggers = (triggersRes.data ?? []) as TriggerRow[];
    const logs = (logsRes.data ?? []) as LogRow[];
    const recent7dCount = recent7dRes.count ?? 0;

    // Aggregate per trigger_id
    type Agg = { shown: number; clicked: number; dismissed: number; last_shown_at: string | null };
    const aggMap = new Map<string, Agg>();
    let totalShown = 0;
    let totalClicked = 0;
    let totalDismissed = 0;

    for (const log of logs) {
      totalShown++;
      if (log.clicked) totalClicked++;
      if (log.dismissed) totalDismissed++;
      if (!log.trigger_id) continue;
      const cur = aggMap.get(log.trigger_id) ?? { shown: 0, clicked: 0, dismissed: 0, last_shown_at: null };
      cur.shown++;
      if (log.clicked) cur.clicked++;
      if (log.dismissed) cur.dismissed++;
      if (!cur.last_shown_at || log.shown_at > cur.last_shown_at) {
        cur.last_shown_at = log.shown_at;
      }
      aggMap.set(log.trigger_id, cur);
    }

    const withStats = triggers.map((t) => {
      const a = aggMap.get(t.id) ?? { shown: 0, clicked: 0, dismissed: 0, last_shown_at: null };
      const click_pct = a.shown > 0 ? Math.round((a.clicked / a.shown) * 1000) / 10 : null;
      const dismiss_pct = a.shown > 0 ? Math.round((a.dismissed / a.shown) * 1000) / 10 : null;
      return {
        ...t,
        stats: {
          shown: a.shown,
          clicked: a.clicked,
          dismissed: a.dismissed,
          click_pct,
          dismiss_pct,
          last_shown_at: a.last_shown_at,
        },
      };
    });

    const overall_click_pct = totalShown > 0 ? Math.round((totalClicked / totalShown) * 1000) / 10 : null;

    return Response.json({
      triggers: withStats,
      overview: {
        total_shown: totalShown,
        total_clicked: totalClicked,
        total_dismissed: totalDismissed,
        overall_click_pct,
        recent7d_count: recent7dCount,
        total_rules: triggers.length,
        enabled_rules: triggers.filter((t) => t.enabled).length,
      },
    });
  } catch (e) {
    console.error('[admin/triggers GET]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (role !== 'super_admin' && role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { trigger_key, page, condition, ola_state, message_zh, message_en, action_type, action_payload, frequency_limit, priority, enabled } = body;

    if (!trigger_key || !page || !message_zh || !message_en) {
      return Response.json({ error: 'Missing required fields: trigger_key, page, message_zh, message_en' }, { status: 400 });
    }

    const insertPayload: Record<string, unknown> = {
      trigger_key,
      page,
      condition: condition ?? {},
      ola_state: ola_state ?? 'suggest',
      message_zh,
      message_en,
      action_type: action_type ?? null,
      action_payload: action_payload ?? null,
      priority: typeof priority === 'number' ? priority : 0,
      enabled: enabled !== false,
    };
    if (frequency_limit) insertPayload.frequency_limit = frequency_limit;

    const { data, error } = await db
      .from('ola_triggers')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[admin/triggers POST]', error);
      return Response.json({ error: error.message || 'Failed to create' }, { status: 500 });
    }

    await db.from('admin_work_logs').insert({
      admin_id: user.id,
      action: 'trigger_create',
      action_category: 'ola_triggers',
      target_type: 'ola_trigger',
      target_id: data.id,
      target_name: data.trigger_key,
      details: { role, page: data.page },
    }).catch((e: unknown) => console.error('[admin/triggers audit]', e));

    return Response.json(data, { status: 201 });
  } catch (e) {
    console.error('[admin/triggers POST]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (role !== 'super_admin' && role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>;

    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (rest[key] !== undefined) updates[key] = rest[key];
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: existingRaw } = await db
      .from('ola_triggers')
      .select('id, trigger_key')
      .eq('id', id)
      .single();
    const existing = existingRaw as { id: string; trigger_key: string } | null;

    const { data, error } = await db
      .from('ola_triggers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[admin/triggers PATCH]', error);
      return Response.json({ error: error?.message || 'Not found or update failed' }, { status: 404 });
    }

    await db.from('admin_work_logs').insert({
      admin_id: user.id,
      action: 'trigger_update',
      action_category: 'ola_triggers',
      target_type: 'ola_trigger',
      target_id: id,
      target_name: existing?.trigger_key ?? id.slice(0, 8),
      details: { role, fields_changed: Object.keys(updates) },
    }).catch((e: unknown) => console.error('[admin/triggers audit]', e));

    return Response.json(data);
  } catch (e) {
    console.error('[admin/triggers PATCH]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
