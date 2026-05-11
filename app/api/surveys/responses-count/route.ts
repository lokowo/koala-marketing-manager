import { getServerUser, getUserRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRole(user.id);
    if (!role || role === 'viewer') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { count, error } = await db
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ count: count ?? 0 });
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
