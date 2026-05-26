import { supabaseAdmin } from '../supabase/server';

// ─── Types ──────────────────────────────────────────

export type UserReaction = 'positive' | 'continued' | 'negative' | 'left' | 'subscribed' | 'neutral';

export interface ConversationLogParams {
  userId: string;
  sessionId: string;
  userMessage: string;
  olaResponse: string;
  olaMode?: string;
  emotionTag?: string;
  imageUsed?: string;
  userReaction?: UserReaction;
  responseTimeMs?: number;
  triggeredBy?: string;
}

// ─── ola_state tag parser (server-side) ─────────────

const OLA_STATE_RE = /<!--\s*ola_state\s*:\s*(\{[^}]*\})\s*-->/;

export function parseOlaStateTag(text: string): { emotionTag?: string; imageUsed?: string } {
  const match = text.match(OLA_STATE_RE);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]) as { emotion?: string; image?: string };
    return { emotionTag: parsed.emotion, imageUsed: parsed.image };
  } catch {
    return {};
  }
}

// ─── Reaction detection ─────────────────────────────

const POSITIVE_PATTERNS = [
  /谢谢|感谢|太好了|太棒了|厉害|好的|收到|明白了|不错|可以|哈哈|嘻嘻|666|👍|❤️|💪/,
  /thank|thanks|great|awesome|perfect|nice|good|lol|haha|amazing|love it/i,
];

const NEGATIVE_PATTERNS = [
  /太贵了|不需要|算了|不用了|没用|不想|放弃|取消|退订|浪费/,
  /too expensive|don't need|never mind|no thanks|useless|cancel|give up/i,
];

const QUESTION_PATTERNS = [
  /[？?]$/,
  /^(怎么|如何|为什么|什么|哪|能不能|可以|请问|帮我|想问|有没有)/,
  /^(how|what|why|where|when|which|can|could|would|is there|do you)/i,
];

export function detectUserReaction(userMessage: string, _previousOlaMode?: string): UserReaction {
  const msg = userMessage.trim();

  for (const pat of POSITIVE_PATTERNS) {
    if (pat.test(msg)) return 'positive';
  }

  for (const pat of NEGATIVE_PATTERNS) {
    if (pat.test(msg)) return 'negative';
  }

  for (const pat of QUESTION_PATTERNS) {
    if (pat.test(msg)) return 'continued';
  }

  if (msg.length > 15) return 'continued';

  return 'neutral';
}

// ─── Log conversation ───────────────────────────────

export async function logConversation(params: ConversationLogParams): Promise<void> {
  const { error } = await (supabaseAdmin
    .from('ola_conversation_logs' as 'ola_sessions')
    .insert({
      user_id: params.userId,
      session_id: params.sessionId,
      user_message: params.userMessage,
      ola_response: params.olaResponse,
      ola_mode: params.olaMode ?? null,
      emotion_tag: params.emotionTag ?? null,
      image_used: params.imageUsed ?? null,
      user_reaction: params.userReaction ?? null,
      response_time_ms: params.responseTimeMs ?? null,
      triggered_by: params.triggeredBy ?? null,
    } as never));

  if (error) {
    console.error('[olaConversationLogger] insert failed:', error.message);
  }
}

// ─── Mark session end (last log gets 'left' reaction) ─

export async function markSessionLeft(sessionId: string): Promise<void> {
  const { data } = await (supabaseAdmin
    .from('ola_conversation_logs' as 'ola_sessions')
    .select('id, user_reaction')
    .eq('session_id' as never, sessionId as never)
    .order('created_at' as never, { ascending: false })
    .limit(1)) as { data: { id: string; user_reaction: string | null }[] | null };

  if (data?.[0] && !data[0].user_reaction) {
    await (supabaseAdmin
      .from('ola_conversation_logs' as 'ola_sessions')
      .update({ user_reaction: 'left' } as never)
      .eq('id' as never, data[0].id as never));
  }
}
