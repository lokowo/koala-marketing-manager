import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_ACCEPTING = ['yes', 'likely', 'maybe', 'no'] as const;
type Accepting = (typeof VALID_ACCEPTING)[number];

interface PatchBody {
  professorId?: string;
  accepting_students?: string | null;
  recruitment_slots?: number | null;
  recruitment_intel?: string | null;
  recruitment_deadline?: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(req: Request) {
  try {
    const { user } = await requireAdmin();

    const body = (await req.json().catch(() => ({}))) as PatchBody;
    const { professorId } = body;

    if (!professorId) {
      return Response.json({ error: 'Missing professorId' }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      recruitment_updated_at: new Date().toISOString(),
      recruitment_updated_by: user.id,
    };

    if (body.accepting_students !== undefined) {
      const val = body.accepting_students;
      if (val === null || val === '') {
        update.accepting_students = null;
      } else if ((VALID_ACCEPTING as readonly string[]).includes(val)) {
        update.accepting_students = val as Accepting;
      } else {
        return Response.json(
          { error: `accepting_students must be one of ${VALID_ACCEPTING.join('|')}` },
          { status: 400 },
        );
      }
    }

    if (body.recruitment_slots !== undefined) {
      if (body.recruitment_slots === null || body.recruitment_slots === undefined) {
        update.recruitment_slots = null;
      } else {
        const n = Math.floor(Number(body.recruitment_slots));
        if (!Number.isFinite(n) || n < 0 || n > 99) {
          return Response.json({ error: 'recruitment_slots must be 0-99 integer' }, { status: 400 });
        }
        update.recruitment_slots = n;
      }
    }

    if (body.recruitment_intel !== undefined) {
      if (body.recruitment_intel === null || body.recruitment_intel === '') {
        update.recruitment_intel = null;
      } else {
        update.recruitment_intel = String(body.recruitment_intel).slice(0, 4000);
      }
    }

    if (body.recruitment_deadline !== undefined) {
      if (!body.recruitment_deadline) {
        update.recruitment_deadline = null;
      } else if (!DATE_RE.test(body.recruitment_deadline)) {
        return Response.json({ error: 'recruitment_deadline must be YYYY-MM-DD' }, { status: 400 });
      } else {
        update.recruitment_deadline = body.recruitment_deadline;
      }
    }

    const { data: prof, error: fetchErr } = await db
      .from('professors')
      .select('id, name, university')
      .eq('id', professorId)
      .single();

    if (fetchErr || !prof) {
      return Response.json({ error: 'Professor not found' }, { status: 404 });
    }

    const { data: updated, error: updErr } = await db
      .from('professors')
      .update(update)
      .eq('id', professorId)
      .select('id, name, accepting_students, recruitment_slots, recruitment_intel, recruitment_deadline, recruitment_updated_at, recruitment_updated_by')
      .single();

    if (updErr || !updated) {
      console.error('[admin/professors/recruitment PATCH]', updErr);
      return Response.json({ error: updErr?.message || 'Failed to update' }, { status: 500 });
    }

    const intelSummary = typeof body.recruitment_intel === 'string'
      ? body.recruitment_intel.slice(0, 120)
      : null;

    await db.from('admin_work_logs').insert({
      admin_id: user.id,
      action: 'professor_recruitment_update',
      action_category: 'professor_management',
      target_type: 'professor',
      target_id: professorId,
      target_name: prof.name,
      details: {
        role: 'admin',
        professorName: prof.name,
        university: prof.university,
        accepting_students: update.accepting_students ?? undefined,
        recruitment_slots: update.recruitment_slots ?? undefined,
        recruitment_deadline: update.recruitment_deadline ?? undefined,
        intel_summary: intelSummary,
      },
    }).catch((e: unknown) => console.error('[admin/professors/recruitment audit]', e));

    return Response.json({ success: true, professor: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/professors/recruitment PATCH]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
