import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase/server';
import { getServerUser } from '../../lib/auth';
import { logWork } from '../../lib/worklog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'date';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20'));
    const publicOnly = url.searchParams.get('public') === 'true';

    let query = db.from('blog_posts').select('*', { count: 'exact' });

    if (publicOnly) {
      query = query.eq('status', 'published');
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title_zh.ilike.%${search}%,title_en.ilike.%${search}%,excerpt_zh.ilike.%${search}%,excerpt_en.ilike.%${search}%`);
    }

    // Always sort pinned first for public queries
    if (publicOnly) {
      query = query.order('is_pinned', { ascending: false, nullsFirst: false });
    }

    if (sort === 'hot' || sort === 'views') {
      query = query.order('view_count', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('published_at', { ascending: false, nullsFirst: false });
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[blog GET]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ posts: data ?? [], total: count ?? 0, page });
  } catch (error) {
    console.error('[blog GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en,
      category, tags, cover_image_url, status, scheduled_at,
      seo_title_zh, seo_title_en, seo_description_zh, seo_description_en,
      seo_keywords_zh, seo_keywords_en, reading_time_zh, reading_time_en,
    } = body;

    if (!title_zh && !title_en) {
      return Response.json({ error: 'At least one title required' }, { status: 400 });
    }

    const row: Record<string, unknown> = {
      title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en,
      category: category || 'phd_guide',
      tags: tags || [],
      cover_image_url,
      status: status || 'draft',
      scheduled_at: scheduled_at || null,
      seo_title_zh, seo_title_en, seo_description_zh, seo_description_en,
      seo_keywords_zh, seo_keywords_en,
      reading_time_zh: reading_time_zh || 5,
      reading_time_en: reading_time_en || null,
    };

    if (status === 'published') {
      row.published_at = new Date().toISOString();
    }

    const { data, error } = await db.from('blog_posts').insert(row).select().single();

    if (error) {
      console.error('[blog POST]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Log blog creation
    const user = await getServerUser();
    if (user) {
      const isPublish = status === 'published';
      await logWork({
        userId: user.id,
        role: 'admin',
        action: isPublish ? 'blog_publish' : 'blog_create',
        actionCategory: 'blog_management',
        targetType: 'blog_post',
        targetId: data?.id,
        targetName: title_zh || title_en || '未命名文章',
        details: { category, status },
      });
    }

    return Response.json({ post: data });
  } catch (error) {
    console.error('[blog POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { data, error } = await db.from('blog_posts').update(updates).eq('id', id).select().single();

    if (error) {
      console.error('[blog PUT]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Log blog update
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
    console.error('[blog PUT]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }

    // Get title before deleting
    const { data: existing } = await db.from('blog_posts').select('title_zh, title_en').eq('id', id).single();

    const { error } = await db.from('blog_posts').delete().eq('id', id);

    if (error) {
      console.error('[blog DELETE]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Log blog deletion
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
    console.error('[blog DELETE]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
