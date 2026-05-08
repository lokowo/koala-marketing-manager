import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 100);
    const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';

    let query = db
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, count, error } = await query;
    if (error) throw error;

    const { count: unreadCount } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return Response.json({
      data: data ?? [],
      total: count ?? 0,
      unreadCount: unreadCount ?? 0,
    });
  } catch (e) {
    console.error('[notifications GET]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, notificationId } = await req.json();

    if (action === 'markRead' && notificationId) {
      await db
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      return Response.json({ success: true });
    }

    if (action === 'markAllRead') {
      await db
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('[notifications POST]', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
