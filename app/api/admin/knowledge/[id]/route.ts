import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';
import { createEmbedding } from '../../../../lib/server/embedding';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_SOURCE_TYPES = [
  'professor_paper', 'arc_grant', 'blog_post', 'faq',
  'user_feedback', 'guide', 'professor_profile', 'manual',
] as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const { data, error } = await db
      .from('knowledge_chunks')
      .select('id, source_type, source_title, content, created_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('[knowledge GET id]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: RouteContext) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { source_title, content, source_type } = body;

    if (source_type && !VALID_SOURCE_TYPES.includes(source_type)) {
      return Response.json(
        { error: `Invalid source_type. Valid values: ${VALID_SOURCE_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const { data: existing, error: fetchErr } = await db
      .from('knowledge_chunks')
      .select('id, content')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (source_title !== undefined) updates.source_title = source_title;
    if (source_type !== undefined) updates.source_type = source_type;
    if (content !== undefined) updates.content = content;

    if (content !== undefined && content !== existing.content) {
      const title = source_title ?? existing.source_title ?? '';
      updates.embedding = await createEmbedding(`${title}\n${content}`);
    }

    const { data, error } = await db
      .from('knowledge_chunks')
      .update(updates)
      .eq('id', id)
      .select('id, source_type, source_title, content, created_at')
      .single();

    if (error) {
      console.error('[knowledge PUT]', error);
      return Response.json({ error: 'Failed to update' }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('[knowledge PUT]', error);
    return Response.json({ error: 'Failed to generate embedding' }, { status: 500 });
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

    const { data: existing } = await db
      .from('knowledge_chunks')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await db
      .from('knowledge_chunks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[knowledge DELETE]', error);
      return Response.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[knowledge DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
