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

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('mode, content, role, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ola/sessions]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const modeMap = new Map<string, {
      mode: string;
      messageCount: number;
      lastMessageAt: string;
      firstUserMessage: string | null;
    }>();

    for (const msg of (messages ?? [])) {
      const existing = modeMap.get(msg.mode);
      if (!existing) {
        modeMap.set(msg.mode, {
          mode: msg.mode,
          messageCount: 1,
          lastMessageAt: msg.created_at,
          firstUserMessage: msg.role === 'user' ? msg.content : null,
        });
      } else {
        existing.messageCount++;
        if (!existing.firstUserMessage && msg.role === 'user') {
          existing.firstUserMessage = msg.content;
        }
      }
    }

    const sessions = Array.from(modeMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return Response.json({ sessions });
  } catch (e) {
    console.error('[ola/sessions]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
