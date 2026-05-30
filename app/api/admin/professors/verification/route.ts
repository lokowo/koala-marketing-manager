import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'Pending';
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = db
      .from('professors')
      .select('id, name, university, data_sources, research_areas, verification_status, downgrade_reason, position_title, verified_at, downgraded_at, accepting_students, recruitment_slots, recruitment_intel, recruitment_deadline, recruitment_updated_at, recruitment_updated_by', { count: 'exact' });

    if (status === 'downgraded') {
      query = query.eq('verification_status', 'Pending').not('downgrade_reason', 'is', null);
    } else {
      query = query.eq('verification_status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,university.ilike.%${search}%`);
    }

    query = query.order('name').range(from, to);

    const { data, count, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as Array<{ recruitment_updated_by: string | null }>;
    const updaterIds = Array.from(
      new Set(rows.map(r => r.recruitment_updated_by).filter((x): x is string => !!x))
    );
    const updaters: Record<string, string> = {};
    if (updaterIds.length > 0) {
      const { data: profiles } = await db
        .from('user_profiles')
        .select('id, display_name, email')
        .in('id', updaterIds);
      for (const p of (profiles ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>) {
        updaters[p.id] = p.display_name || p.email || p.id.slice(0, 8);
      }
    }

    return Response.json({ professors: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE, updaters });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return Response.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 403 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user } = await requireAdmin();

    const body = await req.json();
    const { professorId, action, reason } = body as { professorId?: string; action?: string; reason?: string };

    if (!professorId || !action || !['verify', 'unverify'].includes(action)) {
      return Response.json({ error: 'Missing professorId or invalid action (verify|unverify)' }, { status: 400 });
    }

    const { data: prof, error: fetchErr } = await db
      .from('professors')
      .select('id, name, verification_status')
      .eq('id', professorId)
      .single();

    if (fetchErr || !prof) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updateFields: Record<string, unknown>;

    if (action === 'verify') {
      updateFields = {
        verification_status: 'Verified',
        verified_at: now,
        downgrade_reason: null,
        downgraded_at: null,
      };
    } else {
      updateFields = {
        verification_status: 'Pending',
        downgrade_reason: reason || 'manual_admin',
        downgraded_at: now,
      };
    }

    const { error: updateErr } = await db
      .from('professors')
      .update(updateFields)
      .eq('id', professorId);

    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

    await db.from('admin_work_logs').insert({
      admin_id: user.id,
      action: action === 'verify' ? 'professor_verify' : 'professor_unverify',
      action_category: 'professor_management',
      target_type: 'professor',
      target_id: professorId,
      target_name: prof.name,
      details: { professorId, professorName: prof.name, previousStatus: prof.verification_status, newStatus: action === 'verify' ? 'Verified' : 'Pending', reason: reason || null },
    });

    return Response.json({ success: true, professorId, action, newStatus: action === 'verify' ? 'Verified' : 'Pending' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg === 'Unauthorized' || msg === 'Forbidden') {
      return Response.json({ error: msg }, { status: msg === 'Unauthorized' ? 401 : 403 });
    }
    console.error('[ADMIN_VERIFICATION]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
