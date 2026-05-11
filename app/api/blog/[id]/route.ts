import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getServerUser } from '../../../lib/auth';
import { logWork } from '../../../lib/worklog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let data, error;
    if (isUuid) {
      ({ data, error } = await db.from('blog_posts').select('*').eq('id', id).single());
    } else {
      ({ data, error } = await db.from('blog_posts').select('*').eq('slug', id).single());
    }

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

    const user = await getServerUser();
    if (user) {
      const isPinAction = updates.is_pinned !== undefined && Object.keys(updates).length <= 3;
      const isPublish = updates.status === 'published';
      const action = isPinAction
        ? (updates.is_pinned ? 'blog_pin' : 'blog_unpin')
        : isPublish ? 'blog_publish' : 'blog_update';
      await logWork({
        userId: user.id,
        role: 'admin',
        action,
        actionCategory: 'blog_management',
        targetType: 'blog_post',
        targetId: id,
        targetName: data?.title_zh || data?.title_en || '未命名文章',
        details: { updatedFields: Object.keys(updates) },
      });
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

    const { data: existing } = await db.from('blog_posts').select('title_zh, title_en').eq('id', id).single();

    const { error } = await db.from('blog_posts').delete().eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const user = await getServerUser();
    if (user) {
      await logWork({
        userId: user.id,
        role: 'admin',
        action: 'blog_delete',
        actionCategory: 'blog_management',
        targetType: 'blog_post',
        targetId: id,
        targetName: existing?.title_zh || existing?.title_en || '未命名文章',
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[blog/[id] DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
