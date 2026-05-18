import { supabaseAdmin } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/auth';
import { createEmbeddingsBatch } from '../../../../lib/server/embedding';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_SOURCE_TYPES = [
  'professor_paper', 'arc_grant', 'blog_post', 'faq',
  'user_feedback', 'guide', 'professor_profile', 'manual',
] as const;

const MAX_BATCH_SIZE = 20;

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    if (items.length > MAX_BATCH_SIZE) {
      return Response.json(
        { error: `Maximum batch size is ${MAX_BATCH_SIZE}` },
        { status: 400 },
      );
    }

    const validItems: Array<{ source_title: string; content: string; source_type: string }> = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.source_title || !item.content || !item.source_type) {
        errors.push(`Item ${i}: missing required fields (source_title, content, source_type)`);
        continue;
      }
      if (!VALID_SOURCE_TYPES.includes(item.source_type)) {
        errors.push(`Item ${i}: invalid source_type "${item.source_type}"`);
        continue;
      }
      validItems.push(item);
    }

    if (validItems.length === 0) {
      return Response.json({ error: 'No valid items', details: errors }, { status: 400 });
    }

    const texts = validItems.map(item => `${item.source_title}\n${item.content}`);
    const embeddings = await createEmbeddingsBatch(texts);

    const rows = validItems.map((item, i) => ({
      source_title: item.source_title,
      content: item.content,
      source_type: item.source_type,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await db
      .from('knowledge_chunks')
      .insert(rows);

    if (insertError) {
      console.error('[knowledge batch]', insertError);
      return Response.json({ error: 'Failed to insert chunks' }, { status: 500 });
    }

    return Response.json({
      imported: validItems.length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('[knowledge batch]', error);
    return Response.json({ error: 'Failed to generate embeddings' }, { status: 500 });
  }
}
