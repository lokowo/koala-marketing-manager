import { type NextRequest } from 'next/server';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    const body = await request.json();
    const { conversationId, questionKey, answer } = body as {
      conversationId?: string;
      questionKey?: string;
      answer?: string;
    };

    if (!questionKey || !answer) {
      return Response.json({ error: 'Missing questionKey or answer' }, { status: 400 });
    }

    const { error } = await db.from('chat_feedback').insert({
      user_id: user?.id ?? null,
      conversation_id: conversationId ?? null,
      question_key: questionKey,
      answer,
    });

    if (error) {
      console.error('[chat-feedback]', error);
      return Response.json({ error: '保存失败' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[chat-feedback]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
