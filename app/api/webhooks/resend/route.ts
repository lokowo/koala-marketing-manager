import { NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const RELEVANT_EVENTS = new Set(['email.delivered', 'email.bounced', 'email.complained']);

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured');
      return new Response('Server misconfigured', { status: 500 });
    }

    const body = await req.text();
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response('Missing signature headers', { status: 401 });
    }

    const wh = new Webhook(secret);
    let event: { type: string; data: Record<string, unknown> };
    try {
      event = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as typeof event;
    } catch {
      return new Response('Invalid signature', { status: 401 });
    }

    if (!RELEVANT_EVENTS.has(event.type)) {
      return new Response('OK', { status: 200 });
    }

    const tags = event.data.tags as Record<string, string> | undefined;
    const responseId = tags?.survey_response_id;
    if (!responseId) {
      return new Response('OK', { status: 200 });
    }

    const newStatus = event.type === 'email.delivered' ? 'valid' : 'invalid';

    const { data: existing } = await db
      .from('survey_responses')
      .select('metadata')
      .eq('id', responseId)
      .single();

    const currentMetadata = (existing?.metadata as Record<string, unknown>) || {};

    await db
      .from('survey_responses')
      .update({
        metadata: { ...currentMetadata, email_status: newStatus },
      })
      .eq('id', responseId);

    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('[resend-webhook]', e);
    return new Response('Internal error', { status: 500 });
  }
}
