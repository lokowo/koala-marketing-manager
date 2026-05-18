import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await db
      .from('ola_triggers')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      return Response.json({ error: 'Failed to fetch triggers' }, { status: 500 });
    }

    return Response.json({ triggers: data ?? [] });
  } catch (error) {
    console.error('[ola-triggers GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { trigger_key, page, condition, ola_state, message_zh, message_en, action_type, action_payload, priority } = body;

    if (!trigger_key || !page || !message_zh || !message_en) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await db
      .from('ola_triggers')
      .insert({
        trigger_key,
        page,
        condition: condition ?? {},
        ola_state: ola_state ?? 'suggest',
        message_zh,
        message_en,
        action_type: action_type ?? null,
        action_payload: action_payload ?? null,
        priority: priority ?? 0,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to create trigger' }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('[ola-triggers POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
