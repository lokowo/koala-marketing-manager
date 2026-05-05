import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data, error } = await db
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
    }

    await db
      .from('blog_posts')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id);

    return Response.json({ post: data });
  } catch (error) {
    console.error('[blog/[id] GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const updates = await req.json();

    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ post: data });
  } catch (error) {
    console.error('[blog/[id] PUT]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { error } = await db.from('blog_posts').delete().eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[blog/[id] DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
