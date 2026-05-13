import type { NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { conversationId, messageIndex, rating, correctionText, mode } = body;

    if (!rating) {
      return Response.json({ error: 'Missing rating' }, { status: 400 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return Response.json({ ok: true }); // silent fail in dev

    const supabase = createClient(url, key);
    await supabase.from('feedback').insert({
      conversation_id: conversationId ?? null,
      message_index: messageIndex ?? 0,
      rating,
      correction_text: correctionText ?? null,
      mode: mode ?? 'chat',
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[Feedback]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
