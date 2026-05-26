import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// GET — unread notifications for current user
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('ola_notifications')
      .select('id, type, title, body, related_id, is_read, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[notifications GET]', error);
      return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return Response.json({ notifications: data ?? [] });
  } catch (error) {
    console.error('[notifications GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — mark notification as read
export async function PATCH(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await db
      .from('ola_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[notifications PATCH]', error);
      return Response.json({ error: 'Failed to update notification' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[notifications PATCH]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
