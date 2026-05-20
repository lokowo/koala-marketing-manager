import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    let query = db
      .from('sales_agents')
      .select('*, user_profiles:user_id(display_name, email, avatar_url)')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`referral_code.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let agents = data || [];

    if (search && agents) {
      const q = search.toLowerCase();
      agents = agents.filter((a: any) => {
        const profile = a.user_profiles;
        return (
          a.referral_code?.toLowerCase().includes(q) ||
          profile?.display_name?.toLowerCase().includes(q) ||
          profile?.email?.toLowerCase().includes(q)
        );
      });
    }

    return Response.json({ data: agents });
  } catch (error) {
    console.error('[admin/sales-agents GET]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { user_id, tier } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const { data: existing } = await db
      .from('sales_agents')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: '该用户已经是销售人员' }, { status: 409 });
    }

    let referralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: dup } = await db
        .from('sales_agents')
        .select('id')
        .eq('referral_code', referralCode)
        .maybeSingle();
      if (!dup) break;
      referralCode = generateReferralCode();
      attempts++;
    }

    const { data, error } = await db
      .from('sales_agents')
      .insert({
        user_id,
        referral_code: referralCode,
        status: 'active',
        tier: tier || 'standard',
      })
      .select('*, user_profiles:user_id(display_name, email, avatar_url)')
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error('[admin/sales-agents POST]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
