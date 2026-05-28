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

    // Step 1: Fetch user profile (name is NOT NULL in sales_agents)
    const { data: profile, error: profileErr } = await db
      .from('user_profiles')
      .select('display_name, email')
      .eq('id', user_id)
      .maybeSingle();

    if (profileErr) {
      console.error('[sales-agents POST] step1 profile query failed:', profileErr);
      return Response.json({ error: '查询用户失败' }, { status: 500 });
    }
    if (!profile) {
      console.error('[sales-agents POST] step1 no profile for user_id:', user_id);
      return Response.json({ error: '找不到该用户' }, { status: 404 });
    }

    // Step 2: Check if already a sales agent
    const { data: existing } = await db
      .from('sales_agents')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: '该用户已经是销售人员' }, { status: 409 });
    }

    // Step 3: Generate unique referral code
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

    // Step 4: INSERT (without join — avoids PostgREST rollback if join fails)
    const agentName = profile.display_name || profile.email || 'Unknown';
    const insertPayload = {
      user_id,
      name: agentName,
      email: profile.email || null,
      referral_code: referralCode,
      status: 'active',
      tier: tier || 'standard',
    };

    const { data: inserted, error: insertErr } = await db
      .from('sales_agents')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertErr) {
      console.error('[sales-agents POST] step4 insert failed:', JSON.stringify(insertErr), 'payload:', JSON.stringify(insertPayload));
      if (insertErr.code === '23505') {
        return Response.json({ error: '该用户已经是销售人员' }, { status: 409 });
      }
      return Response.json({ error: `创建失败: ${insertErr.message}` }, { status: 500 });
    }

    // Step 5: Fetch full record with profile join (separate query — safe)
    const { data: fullAgent } = await db
      .from('sales_agents')
      .select('*, user_profiles:user_id(display_name, email, avatar_url)')
      .eq('id', inserted.id)
      .single();

    // Step 6: Assign 'sales' role in user_roles
    const { error: roleErr } = await db
      .from('user_roles')
      .upsert({ user_id, role: 'sales' }, { onConflict: 'user_id' });

    if (roleErr) {
      console.error('[sales-agents POST] step6 user_roles upsert failed:', JSON.stringify(roleErr));
    }

    console.log('[sales-agents POST] success: agent_id=', inserted.id, 'user_id=', user_id);
    return Response.json({ data: fullAgent || inserted });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[sales-agents POST] unhandled:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
