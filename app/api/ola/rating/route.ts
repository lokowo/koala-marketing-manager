import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: Request) {
  try {
    const { session_id, rating, comment } = await req.json();

    if (!session_id || !rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Invalid rating' }, { status: 400 });
    }

    const { error } = await db
      .from('ola_sessions')
      .update({
        rating,
        rating_comment: comment || null,
        rated_at: new Date().toISOString(),
      })
      .eq('session_id', session_id);

    if (error) {
      console.error('[ola/rating]', error);
      return Response.json({ error: 'Failed to save rating' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[ola/rating]', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
