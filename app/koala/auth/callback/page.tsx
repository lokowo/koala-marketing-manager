'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import { Suspense } from 'react';

const isDev = process.env.NODE_ENV === 'development';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  function log(msg: string) {
    setDebugLog(prev => [...prev, `[${new Date().toISOString().slice(11, 23)}] ${msg}`]);
  }

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/koala/home';
    const ref = searchParams.get('ref') || '';

    async function handleCallback() {
      if (!code) {
        log('❌ URL 中没有 code 参数');
        setFailed(true);
        return;
      }

      log(`code: ${code.slice(0, 12)}...`);
      log(`origin: ${window.location.origin}`);
      log(`cookie domain 检查: ${document.cookie.split(';').filter(c => c.trim().startsWith('sb-')).length} 个 sb-* cookie`);

      // Exchange code for session
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          log(`❌ exchange 失败: ${error.message}`);
          if (isDev) {
            setFailed(true);
            return;
          }
          router.replace('/koala/auth?error=oauth_failed');
          return;
        }

        log(`✅ exchange 成功: ${data.session?.user?.email || 'no email'}`);

        if (data?.session?.user) {
          fetch('/api/auth/oauth-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref }),
          }).catch(() => {});
        }
      } catch (e) {
        log(`❌ exchange 异常: ${e instanceof Error ? e.message : String(e)}`);
        if (isDev) {
          setFailed(true);
          return;
        }
        router.replace('/koala/auth?error=oauth_failed');
        return;
      }

      // Verify session is readable
      const { data: sessionData } = await supabase.auth.getSession();
      log(sessionData?.session ? `✅ getSession 有效` : `⚠️ getSession 为空`);

      // Production: auto-redirect
      if (!isDev) {
        router.replace(next);
        return;
      }

      // Dev: show log and wait
      log(`✅ 完成，目标: ${next}`);
    }

    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Production: show spinner while processing
  if (!isDev && !failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080c10]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin border-[#D4A843] mb-4" />
          <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">正在完成登录…</p>
        </div>
      </div>
    );
  }

  // Dev mode or failed: show debug log
  return (
    <div className="min-h-screen bg-[#080c10] text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-lg font-bold mb-4 text-[#D4A843]">
          {isDev ? '🔧 OAuth Callback (Dev)' : '登录遇到问题'}
        </h1>

        <div className="rounded-lg p-4 mb-4 font-mono text-xs space-y-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {debugLog.length === 0 && <p className="text-gray-500">处理中...</p>}
          {debugLog.map((line, i) => (
            <p key={i} className={line.includes('❌') ? 'text-red-400' : line.includes('✅') ? 'text-green-400' : 'text-gray-300'}>
              {line}
            </p>
          ))}
        </div>

        {failed && (
          <button
            onClick={() => router.replace('/koala/auth')}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: '#D4A843', color: '#080c10' }}
          >
            返回登录页
          </button>
        )}

        {isDev && !failed && debugLog.length > 0 && (
          <button
            onClick={() => router.replace(searchParams.get('next') || '/koala/home')}
            className="w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: '#D4A843', color: '#080c10' }}
          >
            继续
          </button>
        )}
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
