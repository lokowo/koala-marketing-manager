import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await db
      .from('university_deadlines')
      .select('*')
      .order('deadline_date');

    if (error) {
      return Response.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
    }

    return Response.json({ deadlines: data ?? [] });
  } catch (error) {
    console.error('[university-deadlines GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { university, program_type, intake_period, deadline_date, scholarship_deadline, description, year } = body;

    if (!university || !intake_period || !deadline_date || !year) {
      return Response.json({ error: 'Missing required fields: university, intake_period, deadline_date, year' }, { status: 400 });
    }

    const { data, error } = await db
      .from('university_deadlines')
      .insert({
        university,
        program_type: program_type || 'PhD',
        intake_period,
        deadline_date,
        scholarship_deadline: scholarship_deadline || null,
        description: description || null,
        year,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to create deadline' }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('[university-deadlines POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
