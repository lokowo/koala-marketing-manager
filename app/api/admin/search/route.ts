import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return Response.json({ results: [] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  try {
    const [profRes, blogRes, userRes] = await Promise.all([
      db.from('professors')
        .select('id, name, university, position_title')
        .or(`name.ilike.%${q}%,university.ilike.%${q}%`)
        .limit(5),
      db.from('blog_posts')
        .select('id, title_zh, title_en, category')
        .or(`title_zh.ilike.%${q}%,title_en.ilike.%${q}%`)
        .limit(5),
      supabaseAdmin.auth.admin.listUsers({ perPage: 100 }),
    ]);

    if (profRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const p of profRes.data as any[]) {
        results.push({
          type: 'professor',
          id: p.id,
          title: p.name,
          subtitle: `${p.university}${p.position_title ? ' · ' + p.position_title : ''}`,
          href: `/dashboard/koala/professors/${p.id}`,
        });
      }
    }

    if (blogRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const b of blogRes.data as any[]) {
        results.push({
          type: 'blog',
          id: b.id,
          title: b.title_zh || b.title_en || 'Untitled',
          subtitle: b.category,
          href: `/dashboard/koala/blog/edit?id=${b.id}`,
        });
      }
    }

    if (userRes.data?.users) {
      const filtered = userRes.data.users
        .filter((u: { email?: string }) => u.email?.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 5);
      for (const u of filtered) {
        results.push({
          type: 'user',
          id: u.id,
          title: u.email || u.id,
          subtitle: `注册于 ${new Date(u.created_at).toLocaleDateString('zh-CN')}`,
          href: `/dashboard/koala/users/${u.id}`,
        });
      }
    }
  } catch (error) {
    console.error('[admin/search]', error);
  }

  return Response.json({ results });
}
