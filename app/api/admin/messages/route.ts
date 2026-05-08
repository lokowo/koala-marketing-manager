import type { NextRequest } from 'next/server';
import { requireAdmin, getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  try {
    const result = await getServerUserWithRole();
    if (!result) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'admin', 'sales'].includes(result.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const threadId = sp.get('threadId');
    const status = sp.get('status') || 'open';

    if (threadId) {
      const [threadRes, msgsRes] = await Promise.all([
        db.from('admin_message_threads').select('*, user_profiles(display_name, email)').eq('id', threadId).single(),
        db.from('admin_messages').select('*, user_profiles:sender_id(display_name, email)').eq('thread_id', threadId).order('created_at', { ascending: true }),
      ]);
      return Response.json({ thread: threadRes.data, messages: msgsRes.data ?? [] });
    }

    let query = db
      .from('admin_message_threads')
      .select('*, user_profiles(display_name, email)', { count: 'exact' })
      .order('last_message_at', { ascending: false })
      .limit(50);

    if (status !== 'all') query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    return Response.json({ data: data ?? [], total: count ?? 0 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/messages GET]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await getServerUserWithRole();
    if (!result) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, threadId, content, userId, subject } = await req.json();

    if (action === 'reply' && threadId && content) {
      await db.from('admin_messages').insert({
        thread_id: threadId,
        sender_id: result.user.id,
        sender_role: result.role,
        content,
      });
      await db.from('admin_message_threads').update({
        last_message_at: new Date().toISOString(),
        assigned_to: result.user.id,
      }).eq('id', threadId);

      return Response.json({ success: true });
    }

    if (action === 'create' && content) {
      const targetUserId = userId || result.user.id;
      const { data: thread } = await db.from('admin_message_threads').insert({
        user_id: targetUserId,
        subject: subject || '新对话',
        status: 'open',
      }).select().single();

      await db.from('admin_messages').insert({
        thread_id: thread.id,
        sender_id: result.user.id,
        sender_role: result.role,
        content,
      });

      return Response.json({ success: true, threadId: thread.id });
    }

    if (action === 'close' && threadId) {
      await requireAdmin();
      await db.from('admin_message_threads').update({ status: 'closed' }).eq('id', threadId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: msg }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: msg }, { status: 403 });
    console.error('[admin/messages POST]', e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
