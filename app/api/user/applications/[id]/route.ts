import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_STAGES = ['saved', 'drafted', 'sent', 'replied', 'preparing', 'submitted', 'interview', 'decided'] as const;
const VALID_OUTCOMES = ['offer', 'rejected', 'withdrawn'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Verify ownership
    const { data: existing } = await db
      .from('applications')
      .select('id, stage')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { stage, outcome, notes, next_action, next_action_date, cold_email_id } = body as {
      stage?: string;
      outcome?: string;
      notes?: string;
      next_action?: string;
      next_action_date?: string;
      cold_email_id?: string;
    };

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (stage !== undefined) {
      if (!VALID_STAGES.includes(stage as typeof VALID_STAGES[number])) {
        return Response.json({ error: 'Invalid stage' }, { status: 400 });
      }
      updates.stage = stage;
      updates[`${stage}_at`] = new Date().toISOString();
    }

    if (outcome !== undefined) {
      if (outcome !== null && !VALID_OUTCOMES.includes(outcome as typeof VALID_OUTCOMES[number])) {
        return Response.json({ error: 'Invalid outcome' }, { status: 400 });
      }
      updates.outcome = outcome;
    }

    if (notes !== undefined) updates.notes = notes;
    if (next_action !== undefined) updates.next_action = next_action;
    if (next_action_date !== undefined) updates.next_action_date = next_action_date || null;
    if (cold_email_id !== undefined) updates.cold_email_id = cold_email_id || null;

    const { data, error } = await db
      .from('applications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        professors:professor_id (
          id, name, university, slug, position_title,
          research_areas, h_index, accepting_students
        )
      `)
      .single();

    if (error) throw error;
    return Response.json({ application: data });
  } catch (error) {
    console.error('[user/applications PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const { error } = await db
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[user/applications DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
