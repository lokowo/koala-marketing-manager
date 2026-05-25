import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ─── Sales Attribution (P2') ─────────────────────────────────────────────
  const ref = request.nextUrl.searchParams.get('ref');
  const ch = request.nextUrl.searchParams.get('ch') || 'unknown';
  const existingRef = request.cookies.get('koala_ref')?.value;

  if (ref && !existingRef) {
    const refData = JSON.stringify({
      ref, ch, ts: Date.now(), lp: request.nextUrl.pathname,
    });
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.koalaphd.com' : undefined,
    };
    supabaseResponse.cookies.set('koala_ref', refData, cookieOpts);

    let visitorFp = request.cookies.get('koala_visitor')?.value;
    if (!visitorFp) {
      visitorFp = crypto.randomUUID();
      supabaseResponse.cookies.set('koala_visitor', visitorFp, {
        ...cookieOpts, httpOnly: false,
      });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = adminClient as any;
    const { data: agent } = await db
      .from('sales_agents').select('id, user_id')
      .eq('referral_code', ref).eq('status', 'active').single();

    if (agent) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip') || 'unknown';
      const ua = request.headers.get('user-agent') || '';
      const cutoff = new Date(Date.now() - 86400000).toISOString();
      const isSelfScan = user && user.id === agent.user_id;

      console.log('[MW:visit] sales agent matched', { ref, agentId: agent.id, isSelfScan, ip });

      if (!isSelfScan) {
        const { count: cookieDups } = await db.from('sales_visits')
          .select('id', { count: 'exact', head: true })
          .eq('visitor_fingerprint', visitorFp)
          .eq('agent_id', agent.id)
          .gte('visited_at', cutoff);

        if (!cookieDups || cookieDups === 0) {
          const { count: ipCount } = await db.from('sales_visits')
            .select('id', { count: 'exact', head: true })
            .eq('ip', ip)
            .eq('agent_id', agent.id)
            .gte('visited_at', cutoff);

          if ((ipCount || 0) < 5) {
            const now = new Date();
            const hourBucket = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString();
            const { error: insertErr } = await db.from('sales_visits').insert({
              agent_id: agent.id,
              channel: ch || 'unknown',
              visitor_fingerprint: visitorFp,
              landing_page: request.nextUrl.pathname,
              ip,
              user_agent: ua,
              is_suspicious: (ipCount || 0) >= 3,
              hour_bucket: hourBucket,
            });
            console.log('[MW:visit] sales_visits insert', insertErr ? `ERROR: ${insertErr.message}` : 'OK');
          }
        }
      }
    } else {
      console.log('[MW:visit] not a sales agent, checking referral code', { ref: ref.toUpperCase() });
      const { data: referrerProfile } = await db
        .from('user_profiles')
        .select('id, referral_code')
        .eq('referral_code', ref.toUpperCase())
        .single();

      if (!referrerProfile) {
        const { data: codeRow } = await db
          .from('referral_codes')
          .select('user_id')
          .eq('code', ref.toUpperCase())
          .single();
        if (codeRow) {
          const { error: insertErr } = await db.from('referral_visits').insert({
            referral_code: ref.toUpperCase(),
            referrer_user_id: codeRow.user_id,
            landing_page: request.nextUrl.pathname,
            visitor_fingerprint: visitorFp,
          });
          console.log('[MW:visit] referral_visits insert (via referral_codes)', insertErr ? `ERROR: ${insertErr.message}` : 'OK');
        } else {
          console.log('[MW:visit] no matching referral code found for', ref.toUpperCase());
        }
      } else {
        const { error: insertErr } = await db.from('referral_visits').insert({
          referral_code: ref.toUpperCase(),
          referrer_user_id: referrerProfile.id,
          landing_page: request.nextUrl.pathname,
          visitor_fingerprint: visitorFp,
        });
        console.log('[MW:visit] referral_visits insert (via user_profiles)', insertErr ? `ERROR: ${insertErr.message}` : 'OK');
      }
    }
  }

  if (!request.cookies.get('koala_visitor')?.value) {
    supabaseResponse.cookies.set('koala_visitor', crypto.randomUUID(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.koalaphd.com' : undefined,
    });
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/koala';
    url.searchParams.delete('from');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
