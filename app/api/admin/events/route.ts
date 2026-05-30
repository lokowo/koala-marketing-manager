import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const EVENT_CATEGORIES = ['cafe', 'cultural', 'nightclub', 'outdoor', 'restaurant', 'music', 'festival', 'other'] as const;
const PAGE_SIZE = 50;

interface IncomingEvent {
  event_name?: unknown;
  event_name_cn?: unknown;
  venue?: unknown;
  event_date?: unknown;
  event_time?: unknown;
  category?: unknown;
  description?: unknown;
  ola_comment?: unknown;
  source_url?: unknown;
  city?: unknown;
}

function sanitize(e: IncomingEvent) {
  const cat = String(e.category ?? '').toLowerCase();
  const safeCategory = (EVENT_CATEGORIES as readonly string[]).includes(cat) ? cat : 'other';
  const event_date = typeof e.event_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.event_date)
    ? e.event_date
    : null;
  return {
    city: (typeof e.city === 'string' && e.city.trim()) ? e.city.trim().toLowerCase() : 'sydney',
    event_name: String(e.event_name ?? '').trim(),
    event_name_cn: String(e.event_name_cn ?? e.event_name ?? '').trim(),
    venue: e.venue ? String(e.venue).trim() : null,
    event_date,
    event_time: e.event_time ? String(e.event_time).trim() : null,
    category: safeCategory,
    description: e.description ? String(e.description).trim() : null,
    ola_comment: e.ola_comment ? String(e.ola_comment).trim() : null,
    source: 'admin_manual',
    source_url: e.source_url ? String(e.source_url).trim() : null,
    is_active: true,
  };
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return Response.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 403 });
  }

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await db
      .from('ola_events')
      .select('id, city, event_name, event_name_cn, venue, event_date, event_time, category, description, ola_comment, source, source_url, is_active, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ events: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
  } catch (err) {
    console.error('[admin/events GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let user: { id: string };
  try {
    const result = await requireAdmin();
    user = result.user;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return Response.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 403 });
  }

  let body: { events?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return Response.json({ error: '请传入 events 数组（至少 1 个活动）' }, { status: 400 });
  }

  const rows = (body.events as IncomingEvent[]).map(sanitize);

  // 必填检查：event_name + event_name_cn
  const invalid = rows.find(r => !r.event_name || !r.event_name_cn);
  if (invalid) {
    return Response.json({ error: '每个活动的英文名 / 中文名都不能为空' }, { status: 400 });
  }

  const { data, error } = await db
    .from('ola_events')
    .insert(rows)
    .select('id, event_name, event_name_cn, event_date');

  if (error) {
    console.error('[admin/events POST]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 审计
  await db.from('admin_work_logs').insert({
    admin_id: user.id,
    action: 'ola_event_create',
    action_category: 'ola_content',
    target_type: 'ola_event',
    target_id: data?.[0]?.id ?? null,
    target_name: data?.map((d: { event_name: string }) => d.event_name).join(', ').slice(0, 200) ?? null,
    details: { count: rows.length, events: data },
  });

  return Response.json({ success: true, inserted: rows.length, events: data });
}
