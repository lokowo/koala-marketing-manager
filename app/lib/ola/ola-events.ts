import { supabaseAdmin } from '../supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export type OlaEventType =
  | 'session_start'
  | 'faq_hit'
  | 'llm_call'
  | 'professor_match'
  | 'credit_action';

export async function recordEvent(
  sessionId: string,
  eventType: OlaEventType,
  eventData: Record<string, unknown>,
  userId?: string | null,
): Promise<void> {
  try {
    await db
      .from('ola_conversation_events')
      .insert({
        session_id: sessionId,
        user_id: userId ?? null,
        event_type: eventType,
        event_data: eventData,
      });
  } catch (err) {
    console.error('[ola-events recordEvent]', err);
  }
}
