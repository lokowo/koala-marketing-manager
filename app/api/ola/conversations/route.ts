import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '../../../lib/auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET: load conversation(s) from ai_conversations
//   ?mode=path          → latest conversation for this mode
//   ?sessionId=xxx      → specific session
//   ?list=true&limit=20 → list sessions (for sidebar)
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    const sessionId = url.searchParams.get('sessionId');
    const listMode = url.searchParams.get('list') === 'true';

    const supabase = getSupabaseAdmin();

    if (listMode) {
      const limit = Math.min(Number(url.searchParams.get('limit') || '30'), 50);
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('session_id, mode, messages, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ola/conversations list]', error);
        return Response.json({ error: error.message }, { status: 500 });
      }

      const seen = new Set<string>();
      const sessions = (data ?? [])
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
    }

    if (sessionId) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('session_id, mode, messages, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[ola/conversations sessionId]', error);
        return Response.json({ error: error.message }, { status: 500 });
      }

      if (!data) return Response.json({ conversation: null });

      return Response.json({
        conversation: {
          sessionId: data.session_id,
          mode: data.mode,
          messages: data.messages,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    if (mode) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('session_id, mode, messages, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[ola/conversations mode]', error);
        return Response.json({ error: error.message }, { status: 500 });
      }

      if (!data) return Response.json({ conversation: null });

      return Response.json({
        conversation: {
          sessionId: data.session_id,
          mode: data.mode,
          messages: data.messages,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    return Response.json({ error: 'Provide mode, sessionId, or list=true' }, { status: 400 });
  } catch (e) {
    console.error('[ola/conversations GET]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: clear conversation history for a mode
export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { mode, sessionId } = await req.json();
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', user.id);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else if (mode) {
      query = query.eq('mode', mode);
    } else {
      return Response.json({ error: 'Provide mode or sessionId' }, { status: 400 });
    }

    const { error } = await query;

    if (error) {
      console.error('[ola/conversations DELETE]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('[ola/conversations DELETE]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
