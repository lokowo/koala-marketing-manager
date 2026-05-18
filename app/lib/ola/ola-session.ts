import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface OlaSession {
  id: string;
  session_id: string;
  user_id: string | null;
  mode: string;
  status: SessionStatus;
  message_count: number;
  first_message_at: string;
  last_message_at: string;
  metadata: Record<string, unknown> | null;
}

export async function upsertSession(
  sessionId: string,
  opts: { userId?: string; mode?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from('ola_sessions')
    .select('id, message_count')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    await db
      .from('ola_sessions')
      .update({
        message_count: (existing.message_count ?? 0) + 1,
        last_message_at: now,
        status: 'active',
        ...(opts.mode ? { mode: opts.mode } : {}),
      })
      .eq('id', existing.id);
  } else {
    await db
      .from('ola_sessions')
      .insert({
        session_id: sessionId,
        user_id: opts.userId ?? null,
        mode: opts.mode ?? 'chat',
        status: 'active',
        message_count: 1,
        first_message_at: now,
        last_message_at: now,
        metadata: opts.metadata ?? null,
      });
  }
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
): Promise<void> {
  await db
    .from('ola_sessions')
    .update({ status, last_message_at: new Date().toISOString() })
    .eq('session_id', sessionId);
}
