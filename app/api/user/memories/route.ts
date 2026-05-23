import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await db
      .from('user_memories')
      .select('id, memory_text, category, confidence, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('category')
      .order('confidence', { ascending: false });

    if (error) {
      console.error('[user/memories GET]', error);
      return Response.json({ error: 'Failed to fetch memories' }, { status: 500 });
    }

    const grouped: Record<string, typeof data> = {};
    for (const row of data ?? []) {
      const cat = row.category as string;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(row);
    }

    return Response.json({ memories: grouped, total: (data ?? []).length });
  } catch (error) {
    console.error('[user/memories GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
