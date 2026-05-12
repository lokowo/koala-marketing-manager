import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/server';
import { getServerUser } from '../../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('banner_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[banner settings GET]', error);
      return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return Response.json({ settings: data || { auto_play: true, interval_seconds: 5, transition_speed: 500 } });
  } catch (e) {
    console.error('[banner settings GET]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { auto_play, interval_seconds, transition_speed } = body;

    const { data, error } = await db
      .from('banner_settings')
      .update({
        auto_play: auto_play ?? true,
        interval_seconds: interval_seconds ?? 5,
        transition_speed: transition_speed ?? 500,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('[banner settings PUT]', error);
      return Response.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return Response.json({ settings: data });
  } catch (e) {
    console.error('[banner settings PUT]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
