import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const y = parseInt(dateStr.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

function toFrontend(row: Record<string, unknown>) {
  return {
    id: row.id,
    company: row.company ?? '',
    position: row.position ?? null,
    start_date: row.start_year ? `${row.start_year}` : null,
    end_date: row.end_year ? `${row.end_year}` : null,
    is_current: row.is_current ?? (row.status === 'current'),
    description: row.description ?? null,
    created_at: row.created_at,
  };
}

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('work_history')
      .select('*')
      .eq('user_id', user.id)
      .order('start_year', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return Response.json({ work: (data ?? []).map(toFrontend) });
  } catch (error) {
    console.error('[user/work GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.company) {
      return Response.json({ error: 'company is required' }, { status: 400 });
    }

    const { data, error } = await db
      .from('work_history')
      .insert({
        user_id: user.id,
        company: body.company,
        position: body.position || '未填写',
        description: body.description || null,
        start_year: extractYear(body.start_date),
        end_year: extractYear(body.end_date),
        is_current: body.is_current ?? false,
        status: body.is_current ? 'current' : 'completed',
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ entry: toFrontend(data) });
  } catch (error) {
    console.error('[user/work POST]', error);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.company !== undefined) updates.company = body.company;
    if (body.position !== undefined) updates.position = body.position || '未填写';
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.start_date !== undefined) updates.start_year = extractYear(body.start_date);
    if (body.end_date !== undefined) updates.end_year = extractYear(body.end_date);
    if (body.is_current !== undefined) {
      updates.is_current = body.is_current;
      updates.status = body.is_current ? 'current' : 'completed';
    }

    const { data, error } = await db
      .from('work_history')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ entry: toFrontend(data) });
  } catch (error) {
    console.error('[user/work PUT]', error);
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
      .from('work_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[user/work DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
