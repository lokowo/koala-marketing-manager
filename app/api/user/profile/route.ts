import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return Response.json({ profile: data ?? null });
  } catch (error) {
    console.error('[user/profile GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const { error } = await db
      .from('user_profiles')
      .upsert({ user_id: user.id, ...body, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('[user/profile POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
