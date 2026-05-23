import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { memory_text } = body;

    if (!memory_text || typeof memory_text !== 'string' || memory_text.trim().length === 0) {
      return Response.json({ error: 'memory_text is required' }, { status: 400 });
    }

    const { data, error } = await db
      .from('user_memories')
      .update({ memory_text: memory_text.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select('id, memory_text, category, confidence, created_at, updated_at')
      .single();

    if (error || !data) {
      return Response.json({ error: 'Memory not found' }, { status: 404 });
    }

    return Response.json({ memory: data });
  } catch (error) {
    console.error('[user/memories PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const { error } = await db
      .from('user_memories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return Response.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[user/memories DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
