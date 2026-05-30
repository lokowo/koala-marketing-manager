import type { NextRequest } from 'next/server';
import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_STATUS = ['pending', 'executed', 'needs_human', 'approved', 'rejected', 'failed', 'all'] as const;

type FixRow = {
  id: string;
  report_id: string | null;
  fix_type: string;
  target: string;
  section: string | null;
  change_description: string;
  data: unknown;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  executed_at: string | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  week_number: number | null;
  report_json: { summary?: string; stats?: { totalTurns?: number; uniqueUsers?: number } } | null;
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
    const fixType = sp.get('fix_type');

    let query = db
      .from('ola_pending_fixes')
      .select(
        'id, report_id, fix_type, target, section, change_description, data, status, reviewed_by, reviewed_at, review_note, executed_at, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status !== 'all') query = query.eq('status', status);
    if (fixType) query = query.eq('fix_type', fixType);

    const { data: fixesRaw, count, error } = await query;
    if (error) {
      console.error('[admin/evolution GET]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const fixes = (fixesRaw ?? []) as FixRow[];

    // Reviewer name map
    const reviewerIds = Array.from(new Set(fixes.map((r) => r.reviewed_by).filter((x): x is string => !!x)));
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

    // Report summary map
    const reportIds = Array.from(new Set(fixes.map((r) => r.report_id).filter((x): x is string => !!x)));
    const reports: Record<string, { week_number: number | null; summary: string | null; total_turns: number | null; unique_users: number | null; created_at: string }> = {};
    if (reportIds.length > 0) {
      const { data: reportRows } = await db
        .from('ola_evolution_reports')
        .select('id, week_number, report_json, created_at')
        .in('id', reportIds);
      for (const r of (reportRows ?? []) as ReportRow[]) {
        reports[r.id] = {
          week_number: r.week_number,
          summary: r.report_json?.summary ?? null,
          total_turns: r.report_json?.stats?.totalTurns ?? null,
          unique_users: r.report_json?.stats?.uniqueUsers ?? null,
          created_at: r.created_at,
        };
      }
    }

    // Status counts (always return for tab badges, independent of filter)
    const { data: countsRaw } = await db
      .from('ola_pending_fixes')
      .select('status');
    const counts: Record<string, number> = {};
    for (const row of (countsRaw ?? []) as Array<{ status: string }>) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }

    return Response.json({
      data: fixes,
      total: count ?? 0,
      page,
      limit,
      reviewers,
      reports,
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
      .from('ola_pending_fixes')
      .select('id, status, fix_type, target, section, change_description')
      .eq('id', id)
      .single();

    if (fetchErr || !existingRaw) {
      return Response.json({ error: 'Fix not found' }, { status: 404 });
    }
    const existing = existingRaw as { id: string; status: string; fix_type: string; target: string; section: string | null; change_description: string };

    if (existing.fix_type !== 'prompt_update') {
      return Response.json(
        { error: `仅 prompt_update 类型的 fix 需要审批（当前 ${existing.fix_type}）` },
        { status: 400 }
      );
    }
    if (existing.status !== 'pending') {
      return Response.json({ error: `当前状态为 ${existing.status}，不可再次审批` }, { status: 409 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { data: updated, error: updErr } = await db
      .from('ola_pending_fixes')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: review_note?.slice(0, 2000) ?? null,
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, fix_type, target, section, change_description, status, reviewed_at, review_note')
      .single();

    if (updErr || !updated) {
      console.error('[admin/evolution PATCH]', updErr);
      return Response.json({ error: 'Failed to update' }, { status: 500 });
    }

    await db.from('admin_work_logs').insert({
      admin_id: user.id,
      action: `evolution_fix_${newStatus}`,
      action_category: 'ola_evolution',
      target_type: 'ola_pending_fix',
      target_id: id,
      target_name: `${existing.target}${existing.section ? ' · ' + existing.section : ''}`,
      details: {
        role,
        fix_type: existing.fix_type,
        target: existing.target,
        section: existing.section,
        change_description: existing.change_description,
        review_note: review_note ?? null,
      },
    }).catch((e: unknown) => console.error('[admin/evolution audit]', e));

    return Response.json({
      success: true,
      fix: updated,
      message:
        newStatus === 'approved'
          ? '已批准。本接口不会自动改 persona，请通过 Claude Code 指令落地此 persona 改动（引用此 fix ID）。'
          : '已拒绝。该 fix 不会被落地。',
    });
  } catch (e) {
    console.error('[admin/evolution PATCH]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
