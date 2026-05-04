import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET: load recent messages for a mode
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const mode = url.searchParams.get('mode');
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 100);

    if (!userId || !mode) {
      return Response.json({ error: 'userId and mode required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, metadata, created_at')
      .eq('user_id', userId)
      .eq('mode', mode)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[chat-history GET]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ messages: data ?? [] });
  } catch (e) {
    console.error('[chat-history GET]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: save messages (batch)
export async function POST(req: NextRequest) {
  try {
    const { userId, mode, messages } = await req.json();

    if (!userId || !mode || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'userId, mode, and messages required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const rows = messages.map((m: { role: string; content: string; metadata?: unknown }) => ({
      user_id: userId,
      mode,
      role: m.role,
      content: m.content,
      metadata: m.metadata || null,
    }));

    const { error } = await supabase.from('chat_messages').insert(rows);

    if (error) {
      console.error('[chat-history POST]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error('[chat-history POST]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: clear history for a mode
export async function DELETE(req: NextRequest) {
  try {
    const { userId, mode } = await req.json();

    if (!userId || !mode) {
      return Response.json({ error: 'userId and mode required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
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
