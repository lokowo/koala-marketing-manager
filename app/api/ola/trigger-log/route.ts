import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trigger_id, page, clicked, dismissed, user_id } = body;

    if (!trigger_id) {
      return Response.json({ error: 'Missing trigger_id' }, { status: 400 });
    }

    await db.from('ola_trigger_logs').insert({
      trigger_id,
      user_id: user_id ?? null,
      page: page ?? null,
      clicked: clicked ?? false,
      dismissed: dismissed ?? false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[trigger-log POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
