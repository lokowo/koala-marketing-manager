import { supabaseAdmin } from '../../../lib/supabase/server';
import { getServerUser } from '../../../lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userIds } = await request.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return Response.json({ emails: {} });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from('user_profiles')
      .select('id, email, display_name')
      .in('id', userIds.slice(0, 100));

    const emails: Record<string, string> = {};
    for (const row of data || []) {
      emails[row.id] = row.email || row.display_name || row.id;
    }

    return Response.json({ emails });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
