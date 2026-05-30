import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_STATUS = ['pending', 'approved', 'rejected', 'all'] as const;
const VALID_CATEGORIES = ['persona', 'prompt', 'knowledge', 'feature', 'flow'] as const;

type SuggestionRow = {
  id: string;
  category: string;
  title: string;
  suggestion: string;
  evidence: string | null;
  source_sample_count: number | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (role !== 'super_admin' && role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const statusRaw = (sp.get('status') ?? 'pending').toLowerCase();
    const status = (VALID_STATUS as readonly string[]).includes(statusRaw) ? statusRaw : 'pending';
    const page = Math.max(parseInt(sp.get('page') ?? '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '30', 10), 1), 100);
    const categoryRaw = (sp.get('category') ?? '').toLowerCase();
    const category = (VALID_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : null;

    let query = db
      .from('ola_evolution_suggestions')
      .select(
        'id, category, title, suggestion, evidence, source_sample_count, status, reviewed_by, reviewed_at, review_note, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status !== 'all') query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data: rowsRaw, count, error } = await query;
    if (error) {
      console.error('[admin/evolution GET]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const rows = (rowsRaw ?? []) as SuggestionRow[];

    // Reviewer name map
    const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewed_by).filter((x): x is string => !!x)));
    const reviewers: Record<string, string> = {};
    if (reviewerIds.length > 0) {
      const { data: profiles } = await db
        .from('user_profiles')
        .select('id, display_name, email')
        .in('id', reviewerIds);
      for (const p of (profiles ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>) {
        reviewers[p.id] = p.display_name || p.email || p.id.slice(0, 8);
      }
    }

    // Status counts (for tab badges, independent of current filter)
    const { data: countsRaw } = await db
      .from('ola_evolution_suggestions')
      .select('status');
    const counts: Record<string, number> = {};
    for (const row of (countsRaw ?? []) as Array<{ status: string }>) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }

    return Response.json({
      data: rows,
      total: count ?? 0,
      page,
      limit,
      reviewers,
      counts,
      currentRole: role,
    });
  } catch (e) {
    console.error('[admin/evolution GET]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: only super_admin can approve/reject' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { id, action, review_note } = body as { id?: string; action?: string; review_note?: string };

    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
    if (action !== 'approve' && action !== 'reject') {
      return Response.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    const { data: existingRaw, error: fetchErr } = await db
      .from('ola_evolution_suggestions')
      .select('id, status, category, title, suggestion')
      .eq('id', id)
      .single();

    if (fetchErr || !existingRaw) {
      return Response.json({ error: 'Suggestion not found' }, { status: 404 });
    }
    const existing = existingRaw as { id: string; status: string; category: string; title: string; suggestion: string };

    if (existing.status !== 'pending') {
      return Response.json({ error: `当前状态为 ${existing.status}，不可再次审批` }, { status: 409 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { data: updated, error: updErr } = await db
      .from('ola_evolution_suggestions')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: review_note?.slice(0, 2000) ?? null,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, category, title, suggestion, status, reviewed_at, review_note')
      .single();

    if (updErr || !updated) {
      console.error('[admin/evolution PATCH]', updErr);
      return Response.json({ error: 'Failed to update' }, { status: 500 });
    }

    await db.from('admin_work_logs').insert({
      admin_id: user.id,
      action: `evolution_suggestion_${newStatus}`,
      action_category: 'ola_evolution',
      target_type: 'ola_evolution_suggestion',
      target_id: id,
      target_name: `${existing.category} · ${existing.title}`,
      details: {
        role,
        category: existing.category,
        title: existing.title,
        suggestion: existing.suggestion,
        review_note: review_note ?? null,
      },
    }).catch((e: unknown) => console.error('[admin/evolution audit]', e));

    return Response.json({
      success: true,
      suggestion: updated,
      message:
        newStatus === 'approved'
          ? '已批准。本接口不会自动改 persona / prompt，请通过 Claude Code 指令落地此建议（引用建议 ID）。'
          : '已拒绝。该建议不会被落地。',
    });
  } catch (e) {
    console.error('[admin/evolution PATCH]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
