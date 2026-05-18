import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '';

    const { data, error } = await db
      .from('ola_triggers')
      .select('id, trigger_key, page, condition, ola_state, message_zh, message_en, action_type, action_payload, frequency_limit, priority')
      .eq('enabled', true)
      .or(`page.eq.${page},page.eq.*`)
      .order('priority', { ascending: false });

    if (error) {
      return Response.json({ error: 'Failed to fetch triggers' }, { status: 500 });
    }

    return Response.json({ triggers: data ?? [] });
  } catch (error) {
    console.error('[ola triggers GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
