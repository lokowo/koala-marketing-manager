import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '../../lib/auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET: load chat history for current user
//   ?mode=path    → latest conversation's messages for this mode
//   ?limit=50     → max messages to return (default 50)
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);

    const supabase = getSupabaseAdmin();

    if (mode) {
      // Find latest conversation for this mode
      const { data: conv } = await supabase
        .from('ai_conversations')
        .select('id, session_id')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conv) return Response.json({ conversation: null, messages: [] });

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, role, content, metadata, created_at')
        .eq('conversation_id', conv.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[chat-history GET]', error);
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({
        conversation: { conversationId: conv.id, sessionId: conv.session_id, mode },
        messages: messages ?? [],
      });
    }

    // No mode: return recent messages grouped by conversation
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, role, content, mode, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[chat-history GET]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Group by conversation_id
    const grouped: Record<string, { conversationId: string; mode: string | null; messages: typeof messages }> = {};
    for (const msg of (messages ?? [])) {
      const cid = msg.conversation_id;
      if (!grouped[cid]) {
        grouped[cid] = { conversationId: cid, mode: msg.mode, messages: [] };
      }
      grouped[cid].messages.push(msg);
    }

    return Response.json({ conversations: Object.values(grouped) });
  } catch (e) {
    console.error('[chat-history GET]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: batch upload messages (for localStorage migration)
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { mode, messages } = await req.json();

    if (!mode || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'mode and messages required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Create a conversation record first
    const sessionId = `migrated_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { data: conv, error: convError } = await supabase
      .from('ai_conversations')
      .insert({
        session_id: sessionId,
        mode,
        user_id: user.id,
        messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      })
      .select('id')
      .single();

    if (convError || !conv) {
      console.error('[chat-history POST] conv insert failed:', convError);
      return Response.json({ error: convError?.message || 'Failed to create conversation' }, { status: 500 });
    }

    const rows = messages.map((m: { role: string; content: string; metadata?: unknown }) => ({
      conversation_id: conv.id,
      user_id: user.id,
      mode,
      role: m.role,
      content: m.content,
      metadata: m.metadata || {},
    }));

    const { error } = await supabase.from('chat_messages').insert(rows);

    if (error) {
      console.error('[chat-history POST]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, sessionId, conversationId: conv.id });
  } catch (e) {
    console.error('[chat-history POST]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: clear history for a mode
export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { mode } = await req.json();

    if (!mode) {
      return Response.json({ error: 'mode required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('mode', mode);

    if (error) {
      console.error('[chat-history DELETE]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('[chat-history DELETE]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
