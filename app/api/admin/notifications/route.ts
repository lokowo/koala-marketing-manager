import type { NextRequest } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page') ?? '1', 10), 1);
    const limit = Math.min(parseInt(sp.get('limit') ?? '30', 10), 100);
    const type = sp.get('type') || '';
    const search = sp.get('search') || '';

    let query = db
      .from('notifications')
      .select('*, user_profiles(display_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (type) query = query.eq('type', type);
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    return Response.json({ data: data ?? [], total: count ?? 0, page, limit });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/notifications GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const { action, userId, title, content, type } = await req.json();

    if (action === 'send') {
      if (!userId || !title || !content) {
        return Response.json({ error: 'userId, title, content required' }, { status: 400 });
      }
      const { error } = await db.from('notifications').insert({
        user_id: userId,
        title,
        content,
        type: type || 'admin_message',
        link: null,
      });
      if (error) throw error;
      return Response.json({ success: true });
    }

    if (action === 'broadcast') {
      if (!title || !content) {
        return Response.json({ error: 'title, content required' }, { status: 400 });
      }
      const { data: users } = await db.from('user_profiles').select('id');
      if (users?.length) {
        const rows = users.map((u: { id: string }) => ({
          user_id: u.id,
          title,
          content,
          type: type || 'broadcast',
        }));
        await db.from('notifications').insert(rows);
      }
      return Response.json({ success: true, sent: users?.length ?? 0 });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/notifications POST]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
