import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteContext) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    for (const key of ['trigger_key', 'page', 'condition', 'ola_state', 'message_zh', 'message_en', 'action_type', 'action_payload', 'priority', 'enabled', 'frequency_limit']) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await db
      .from('ola_triggers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return Response.json({ error: 'Not found or update failed' }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('[ola-triggers PUT]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const { error } = await db.from('ola_triggers').delete().eq('id', id);

    if (error) {
      return Response.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[ola-triggers DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
