import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    await db.from('gmail_tokens').delete().eq('user_id', user.id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[gmail/disconnect]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
