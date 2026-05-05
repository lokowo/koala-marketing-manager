import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data, error } = await db
      .from('blog_posts')
      .select('id, title_zh, content_zh, excerpt_zh, published_at, status')
      .eq('professor_id', id)
      .eq('category', 'professor_spotlight')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return Response.json({ article: null, error: error.message }, { status: 500 });
    }

    return Response.json({ article: data || null });
  } catch (error) {
    console.error('[blog/by-professor]', error);
    return Response.json({ article: null }, { status: 500 });
  }
}
