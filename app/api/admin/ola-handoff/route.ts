import { supabaseAdmin } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    let query = db.from('handoff_requests').select('*').order('created_at', { ascending: false });
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: 'Failed to fetch handoff requests' }, { status: 500 });
    }

    return Response.json({ requests: data ?? [] });
  } catch (error) {
    console.error('[ola-handoff GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
