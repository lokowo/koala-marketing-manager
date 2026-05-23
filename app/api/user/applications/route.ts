import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_STAGES = ['saved', 'drafted', 'sent', 'replied', 'preparing', 'submitted', 'interview', 'decided'] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stage = req.nextUrl.searchParams.get('stage');

    let query = db
      .from('applications')
      .select(`
        *,
        professors:professor_id (
          id, name, university, slug, position_title,
          research_areas, h_index, accepting_students
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (stage && VALID_STAGES.includes(stage as typeof VALID_STAGES[number])) {
      query = query.eq('stage', stage);
    }

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ applications: data ?? [] });
  } catch (error) {
    console.error('[user/applications GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { professor_id, notes, stage, cold_email_id } = body as {
      professor_id?: string;
      notes?: string;
      stage?: string;
      cold_email_id?: string;
    };

    if (!professor_id) {
      return Response.json({ error: 'professor_id required' }, { status: 400 });
    }

    const initialStage = (stage && VALID_STAGES.includes(stage as typeof VALID_STAGES[number]))
      ? stage
      : 'saved';

    const stageTimestamp = `${initialStage}_at`;
    const now = new Date().toISOString();

    // Get university from professor
    const { data: prof } = await db
      .from('professors')
      .select('university')
      .eq('id', professor_id)
      .single();

    const row: Record<string, unknown> = {
      user_id: user.id,
      professor_id,
      university: prof?.university ?? null,
      stage: initialStage,
      notes: notes ?? null,
      cold_email_id: cold_email_id ?? null,
      [stageTimestamp]: now,
    };

    const { data, error } = await db
      .from('applications')
      .upsert(row, { onConflict: 'user_id,professor_id' })
      .select(`
        *,
        professors:professor_id (
          id, name, university, slug, position_title,
          research_areas, h_index, accepting_students
        )
      `)
      .single();

    if (error) throw error;
    return Response.json({ application: data }, { status: 201 });
  } catch (error) {
    console.error('[user/applications POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
