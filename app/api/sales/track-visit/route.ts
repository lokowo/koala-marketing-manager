import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST(req: NextRequest) {
  try {
    const { ref, ch, landing_page, fingerprint } = await req.json();

    if (!ref || !fingerprint) {
      return NextResponse.json({ error: 'Missing ref or fingerprint' }, { status: 400 });
    }

    const channel = typeof ch === 'string' && /^[a-z0-9_\-]{1,50}$/.test(ch) ? ch : 'unknown';

    const { data: agent } = await db
      .from('sales_agents')
      .select('id')
      .eq('referral_code', ref)
      .eq('status', 'active')
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid ref' }, { status: 404 });
    }

    const now = new Date();
    const hourBucket = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString();

    const { error } = await db
      .from('sales_visits')
      .upsert(
        {
          agent_id: agent.id,
          channel,
          landing_page: landing_page || '/',
          visitor_fingerprint: fingerprint,
          hour_bucket: hourBucket,
          user_agent: req.headers.get('user-agent') || '',
          ip_hash: '',
          visited_at: now.toISOString(),
        },
        { onConflict: 'agent_id,visitor_fingerprint,channel,hour_bucket', ignoreDuplicates: true }
      );

    if (error) console.error('[track-visit] upsert error:', error);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track-visit]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
