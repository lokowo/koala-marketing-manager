import { getServerUserWithRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: Request) {
  try {
    const result = await getServerUserWithRole();
    if (!result) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: agent } = await db
      .from('sales_agents')
      .select('id')
      .eq('user_id', result.user.id)
      .eq('status', 'active')
      .single();

    if (!agent) return Response.json({ error: 'Not a sales agent' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'created_at';

    const { data: referrals, error } = await db
      .from('sales_referrals')
      .select('*, user_profiles:referred_user_id(display_name, email, avatar_url)')
      .eq('agent_id', agent.id)
      .eq('is_test', false)
      .order(sort === 'revenue' ? 'total_revenue' : 'created_at', { ascending: false });

    if (error) throw error;

    let items = (referrals || []).map((r: any) => {
      const profile = r.user_profiles;
      return {
        id: r.id,
        referred_user_id: r.referred_user_id,
        channel: r.channel,
        landing_page: r.landing_page,
        total_revenue: r.total_revenue || 0,
        total_commission: r.total_commission || 0,
        created_at: r.created_at,
        display_name: profile?.display_name || '',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        has_paid: (r.total_revenue || 0) > 0,
        offline_converted: r.offline_converted || false,
        offline_converted_at: r.offline_converted_at || null,
        offline_notes: r.offline_notes || null,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r: any) =>
        r.display_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    }

    return Response.json({ data: items });
  } catch (error) {
    console.error('[sales/my-referrals]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
