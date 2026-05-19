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
      .from('ola_faq')
      .select('*')
      .order('category')
      .order('priority', { ascending: false });

    if (error) {
      return Response.json({ error: 'Failed to fetch FAQs' }, { status: 500 });
    }

    return Response.json({ faqs: data ?? [] });
  } catch (error) {
    console.error('[ola-faq GET]', error);
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
    const { category, keywords, answer_zh, answer_en, question_patterns, rich_card_type, rich_card_data, priority } = body;

    if (!category || !keywords || !answer_zh || !answer_en) {
      return Response.json({ error: 'Missing required fields: category, keywords, answer_zh, answer_en' }, { status: 400 });
    }

    const { data, error } = await db
      .from('ola_faq')
      .insert({
        category,
        keywords,
        answer_zh,
        answer_en,
        question_patterns: question_patterns ?? [],
        rich_card_type: rich_card_type ?? null,
        rich_card_data: rich_card_data ?? null,
        priority: priority ?? 0,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to create FAQ' }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('[ola-faq POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
