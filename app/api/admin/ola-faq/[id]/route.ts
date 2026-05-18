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
    const { category, keywords, answer_zh, answer_en, question_patterns, rich_card_type, rich_card_data, priority, enabled } = body;

    const updates: Record<string, unknown> = {};
    if (category !== undefined) updates.category = category;
    if (keywords !== undefined) updates.keywords = keywords;
    if (answer_zh !== undefined) updates.answer_zh = answer_zh;
    if (answer_en !== undefined) updates.answer_en = answer_en;
    if (question_patterns !== undefined) updates.question_patterns = question_patterns;
    if (rich_card_type !== undefined) updates.rich_card_type = rich_card_type;
    if (rich_card_data !== undefined) updates.rich_card_data = rich_card_data;
    if (priority !== undefined) updates.priority = priority;
    if (enabled !== undefined) updates.enabled = enabled;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await db
      .from('ola_faq')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return Response.json({ error: 'Not found or update failed' }, { status: 404 });
    }

    return Response.json(data);
  } catch (error) {
    console.error('[ola-faq PUT]', error);
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

    const { error } = await db
      .from('ola_faq')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ola-faq DELETE]', error);
      return Response.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[ola-faq DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
