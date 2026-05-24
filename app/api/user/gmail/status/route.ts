import { getServerUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { data, error } = await db
      .from('gmail_tokens')
      .select('gmail_address, token_expiry')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[gmail/status]', error);
      return Response.json({ connected: false, gmail_address: null });
    }

    if (!data) {
      return Response.json({ connected: false, gmail_address: null });
    }

    const expired = new Date(data.token_expiry) <= new Date();

    return Response.json({
      connected: true,
      gmail_address: data.gmail_address,
      token_expired: expired,
    });
  } catch (error) {
    console.error('[gmail/status]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
