import { getServerUser } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('session_id, mode, messages, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('[ola/sessions]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const seen = new Set<string>();
    const sessions = (conversations ?? [])
      .filter(row => {
        if (seen.has(row.session_id)) return false;
        seen.add(row.session_id);
        return true;
      })
      .map(row => {
        const msgs = (row.messages as { role: string; content: string }[]) ?? [];
        const firstUser = msgs.find(m => m.role === 'user');
        return {
          sessionId: row.session_id,
          mode: row.mode,
          messageCount: msgs.length,
          lastMessageAt: row.updated_at ?? row.created_at,
          firstUserMessage: firstUser?.content ?? null,
        };
      });

    return Response.json({ sessions });
  } catch (e) {
    console.error('[ola/sessions]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
