import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';
import { createEmbedding } from '../../../lib/server/embedding';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const VALID_SOURCE_TYPES = [
  'professor_paper', 'arc_grant', 'blog_post', 'faq',
  'user_feedback', 'guide', 'professor_profile', 'manual',
] as const;

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
    const sourceType = url.searchParams.get('source_type');
    const search = url.searchParams.get('search');
    const offset = (page - 1) * limit;

    let query = db
      .from('knowledge_chunks')
      .select('id, source_type, source_title, content, created_at', { count: 'exact' });

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    if (search) {
      query = query.or(`source_title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[knowledge GET]', error);
      return Response.json({ error: 'Failed to fetch knowledge chunks' }, { status: 500 });
    }

    return Response.json({
      chunks: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('[knowledge GET]', error);
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
    const { source_title, content, source_type } = body;

    if (!source_title || !content || !source_type) {
      return Response.json(
        { error: 'Missing required fields: source_title, content, source_type' },
        { status: 400 },
      );
    }

    if (!VALID_SOURCE_TYPES.includes(source_type)) {
      return Response.json(
        { error: `Invalid source_type. Valid values: ${VALID_SOURCE_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const embedding = await createEmbedding(`${source_title}\n${content}`);

    const { data, error } = await db
      .from('knowledge_chunks')
      .insert({ source_title, content, source_type, embedding })
      .select('id, source_type, source_title, content, created_at')
      .single();

    if (error) {
      console.error('[knowledge POST]', error);
      return Response.json({ error: 'Failed to create knowledge chunk' }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('[knowledge POST]', error);
    return Response.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}
