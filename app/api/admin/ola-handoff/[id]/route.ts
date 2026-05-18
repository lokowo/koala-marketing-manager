import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'handled') {
        updates.handled_by = admin.user.id;
        updates.handled_at = new Date().toISOString();
      }
    }

    const { data, error } = await db
      .from('handoff_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return Response.json({ error: 'Not found or update failed' }, { status: 404 });
    }

    return Response.json(data);
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
}
