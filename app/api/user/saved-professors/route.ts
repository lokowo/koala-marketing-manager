import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('saved_professors')
      .select(`
        id,
        professor_id,
        notes,
        created_at,
        professors (
          id, name, university, faculty, position_title,
          research_areas, h_index, opportunity_score,
          accepting_students, grant_status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json({ saved: data ?? [] });
  } catch (error) {
    console.error('[saved-professors GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { professor_id, notes } = await req.json();
    if (!professor_id) return Response.json({ error: 'professor_id required' }, { status: 400 });

    const { error } = await db
      .from('saved_professors')
      .upsert({ user_id: user.id, professor_id, notes: notes ?? null }, { onConflict: 'user_id,professor_id' });

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[saved-professors POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const professor_id = req.nextUrl.searchParams.get('professor_id');
    if (!professor_id) return Response.json({ error: 'professor_id required' }, { status: 400 });

    const { error } = await db
      .from('saved_professors')
      .delete()
      .eq('user_id', user.id)
      .eq('professor_id', professor_id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[saved-professors DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
