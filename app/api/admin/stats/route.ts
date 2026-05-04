import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [usersRes, professorsRes, chunksRes, blogPublishedRes, blogDraftRes, chatTodayRes, chatMonthRes] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers(),
      db.from('professors').select('*', { count: 'exact', head: true }),
      db.from('knowledge_chunks').select('*', { count: 'exact', head: true }),
      db.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      db.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      db.from('chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      db.from('chat_messages').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    ]);

    const allUsers = usersRes.data?.users || [];
    const todayUsers = allUsers.filter((u: { created_at: string }) => new Date(u.created_at) >= today);

    return Response.json({
      users: { total: allUsers.length, today: todayUsers.length },
      professors: professorsRes.count ?? 0,
      knowledgeChunks: chunksRes.count ?? 0,
      blog: { published: blogPublishedRes.count ?? 0, draft: blogDraftRes.count ?? 0 },
      chat: { today: chatTodayRes.count ?? 0, month: chatMonthRes.count ?? 0 },
    });
  } catch (error) {
    console.error('[admin/stats]', error);
    return Response.json({
      users: { total: 0, today: 0 },
      professors: 0,
      knowledgeChunks: 0,
      blog: { published: 0, draft: 0 },
      chat: { today: 0, month: 0 },
    });
  }
}
