'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/koala/home';
    const ref = searchParams.get('ref') || '';

    async function handleCallback() {
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('[oauth-callback] exchangeCodeForSession failed:', error.message);
          router.replace('/koala/auth?error=oauth_failed');
          return;
        }

        if (data?.session?.user) {
          // Fire-and-forget: initialize profile on server
          fetch('/api/auth/oauth-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref }),
          }).catch(() => {});
        }
      }

      router.replace(next);
    }

    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080c10]">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin border-[#D4A843] mb-4" />
        <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">正在完成登录…</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080c10]">
        <div className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin border-[#D4A843]" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
