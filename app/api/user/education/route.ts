import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('education_history')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return Response.json({ education: data ?? [] });
  } catch (error) {
    console.error('[user/education GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.school) {
      return Response.json({ error: 'school is required' }, { status: 400 });
    }

    const { data, error } = await db
      .from('education_history')
      .insert({
        user_id: user.id,
        school: body.school,
        major: body.major || null,
        degree: body.degree || null,
        gpa: body.gpa ? parseFloat(body.gpa) : null,
        gpa_scale: body.gpa_scale || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        is_current: body.is_current ?? false,
        description: body.description || null,
        source: body.source || 'manual',
        source_document_id: body.source_document_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ entry: data });
  } catch (error) {
    console.error('[user/education POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const { id, ...updates } = body;
    if (updates.gpa) updates.gpa = parseFloat(updates.gpa);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('education_history')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ entry: data });
  } catch (error) {
    console.error('[user/education PUT]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await db
      .from('education_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[user/education DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
