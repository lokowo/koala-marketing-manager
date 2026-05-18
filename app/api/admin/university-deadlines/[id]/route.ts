import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { university, program_type, intake_period, deadline_date, scholarship_deadline, description, year } = body;

    const { data, error } = await db
      .from('university_deadlines')
      .update({
        ...(university && { university }),
        ...(program_type && { program_type }),
        ...(intake_period && { intake_period }),
        ...(deadline_date && { deadline_date }),
        ...(scholarship_deadline !== undefined && { scholarship_deadline }),
        ...(description !== undefined && { description }),
        ...(year && { year }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update deadline' }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('[university-deadlines PUT]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { error } = await db
      .from('university_deadlines')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: 'Failed to delete deadline' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[university-deadlines DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
