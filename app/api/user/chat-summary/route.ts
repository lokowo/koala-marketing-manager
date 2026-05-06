import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [convResult, msgResult] = await Promise.all([
      db
        .from('ai_conversations')
        .select('id, mode, created_at, messages')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      db
        .from('chat_messages')
        .select('mode')
        .eq('user_id', user.id),
    ]);

    const conversations = (convResult.data ?? []).map((c: { id: string; mode: string; created_at: string; messages: unknown[] }) => ({
      id: c.id,
      mode: c.mode,
      created_at: c.created_at,
      messageCount: Array.isArray(c.messages) ? c.messages.length : 0,
    }));

    const messages = msgResult.data ?? [];
    const stats: Record<string, number> = {};
    for (const m of messages) {
      stats[(m as { mode: string }).mode] = (stats[(m as { mode: string }).mode] ?? 0) + 1;
    }

    return Response.json({ conversations, stats });
  } catch (error) {
    console.error('[chat-summary]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
