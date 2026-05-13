import { supabaseAdmin } from '@/app/lib/supabase/server';
import { requireAdmin } from '@/app/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST() {
  try { await requireAdmin(); } catch { return Response.json({ error: 'Forbidden' }, { status: 403 }); }
  try {
    const { data: posts, error } = await db
      .from('blog_posts')
      .select('id, title_zh, title_en, category, cover_image_url')
      .is('cover_image_url', null)
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return Response.json({ success: true, message: '所有文章已有封面图', triggered: 0 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    let triggered = 0;

    for (const post of posts) {
      fetch(`${baseUrl}/api/blog/generate-cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      }).catch(err => console.error(`[regenerate-all] Failed for ${post.id}:`, err));
      triggered++;
    }

    return Response.json({
      success: true,
      message: `已触发 ${triggered} 篇文章的封面生成`,
      triggered,
      postIds: posts.map((p: { id: string }) => p.id),
    });
  } catch (error) {
    console.error('[regenerate-all-covers]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
