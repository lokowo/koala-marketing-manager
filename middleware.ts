import { createServerClient } from '@supabase/ssr';
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

    if (!request.cookies.get('koala_visitor')?.value) {
      supabaseResponse.cookies.set('koala_visitor', crypto.randomUUID(), {
        ...cookieOpts, httpOnly: false,
      });
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

  const { data: { user } } = await supabase.auth.getUser();
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
