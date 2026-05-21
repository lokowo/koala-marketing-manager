import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return req.cookies.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let body: { manual_channel?: string } = {};
    try { body = await req.json(); } catch { /* no body or invalid JSON — ok */ }

    const refCookie = req.cookies.get('koala_ref')?.value;
    if (!refCookie) return NextResponse.json({ ok: true, attributed: false });

    let refData: { ref?: string; ch?: string; lp?: string };
    try { refData = JSON.parse(refCookie); } catch { return NextResponse.json({ ok: true, attributed: false }); }
    if (!refData.ref) return NextResponse.json({ ok: true, attributed: false });

    const { data: agent } = await db
      .from('sales_agents').select('id')
      .eq('referral_code', refData.ref).eq('status', 'active').single();
    if (!agent) return NextResponse.json({ ok: true, attributed: false });

    const { data: existing } = await db
      .from('sales_referrals').select('id')
      .eq('referred_user_id', user.id).maybeSingle();
    if (existing) return NextResponse.json({ ok: true, attributed: false, reason: 'already_attributed' });

    const channel = refData.ch || body?.manual_channel || 'unknown';
    await db.from('sales_referrals').insert({
      agent_id: agent.id, referred_user_id: user.id,
      channel, landing_page: refData.lp || '/',
    });

    await db.from('sales_audit_logs').insert({
      actor_id: user.id, actor_email: user.email || '', actor_role: 'system',
      action: 'referral_attribution_created', target_type: 'referral',
      details: { ref: refData.ref, ch: refData.ch, agent_id: agent.id },
    });

    const response = NextResponse.json({ ok: true, attributed: true });
    response.cookies.set('koala_ref', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('[attribute]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
