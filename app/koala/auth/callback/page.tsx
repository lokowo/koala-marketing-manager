'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import { Suspense } from 'react';

interface DebugInfo {
  step: string;
  code: string | null;
  exchangeResult: string | null;
  exchangeError: string | null;
  sessionAfterExchange: string | null;
  getSessionResult: string | null;
  getUserResult: string | null;
  cookies: string | null;
  timestamp: string;
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);
  const [debug, setDebug] = useState<DebugInfo>({
    step: '初始化...',
    code: null,
    exchangeResult: null,
    exchangeError: null,
    sessionAfterExchange: null,
    getSessionResult: null,
    getUserResult: null,
    cookies: null,
    timestamp: new Date().toISOString(),
  });
  const [ready, setReady] = useState(false);
  const nextUrl = useRef('/koala/home');
  const refCode = useRef('');

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/koala/home';
    const ref = searchParams.get('ref') || '';
    nextUrl.current = next;
    refCode.current = ref;

    setDebug(prev => ({ ...prev, code: code ? `${code.slice(0, 12)}...` : 'null' }));

    async function handleCallback() {
      if (!code) {
        setDebug(prev => ({ ...prev, step: '❌ 无 code 参数', exchangeError: 'URL 中没有 code 参数' }));
        setReady(true);
        return;
      }

      // Step 1: Exchange code for session
      setDebug(prev => ({ ...prev, step: '🔄 正在交换 code...' }));
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setDebug(prev => ({
            ...prev,
            step: '❌ exchangeCodeForSession 失败',
            exchangeError: `${error.message} (status: ${(error as unknown as Record<string, unknown>).status || 'unknown'})`,
            exchangeResult: JSON.stringify(error, null, 2),
          }));
        } else {
          setDebug(prev => ({
            ...prev,
            step: '✅ exchangeCodeForSession 成功',
            exchangeResult: data?.session ? `user: ${data.session.user.email}, expires: ${new Date((data.session.expires_at || 0) * 1000).toISOString()}` : 'no session in response',
            sessionAfterExchange: data?.session ? `access_token: ${data.session.access_token.slice(0, 20)}...` : 'null',
          }));

          if (data?.session?.user) {
            fetch('/api/auth/oauth-complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ref }),
            }).catch(() => {});
          }
        }
      } catch (e) {
        setDebug(prev => ({
          ...prev,
          step: '❌ exchangeCodeForSession 抛出异常',
          exchangeError: e instanceof Error ? e.message : String(e),
        }));
      }

      // Step 2: Verify with getSession
      setDebug(prev => ({ ...prev, step: prev.step + ' → 🔍 检查 getSession...' }));
      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        setDebug(prev => ({
          ...prev,
          getSessionResult: sessionErr
            ? `error: ${sessionErr.message}`
            : sessionData?.session
              ? `✅ session exists, user: ${sessionData.session.user.email}`
              : '❌ session is null',
        }));
      } catch (e) {
        setDebug(prev => ({ ...prev, getSessionResult: `exception: ${e instanceof Error ? e.message : String(e)}` }));
      }

      // Step 3: Verify with getUser
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        setDebug(prev => ({
          ...prev,
          getUserResult: userErr
            ? `error: ${userErr.message}`
            : userData?.user
              ? `✅ user: ${userData.user.email} (id: ${userData.user.id.slice(0, 8)}...)`
              : '❌ user is null',
        }));
      } catch (e) {
        setDebug(prev => ({ ...prev, getUserResult: `exception: ${e instanceof Error ? e.message : String(e)}` }));
      }

      // Step 4: Check cookies
      setDebug(prev => ({
        ...prev,
        cookies: document.cookie
          .split(';')
          .map(c => c.trim())
          .filter(c => c.startsWith('sb-'))
          .map(c => `${c.split('=')[0]}=${c.split('=')[1]?.slice(0, 20)}...`)
          .join('\n') || '(no sb-* cookies found)',
        step: '✅ 调试完成 — 请截图后点击继续',
      }));

      setReady(true);
    }

    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#080c10] text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-lg font-bold mb-4 text-[#D4A843]">🔧 OAuth Callback 调试面板</h1>
        <p className="text-xs text-gray-400 mb-4">请截图此页面发给开发者</p>

        <div className="space-y-3 text-xs font-mono">
          <DebugRow label="状态" value={debug.step} />
          <DebugRow label="时间" value={debug.timestamp} />
          <DebugRow label="code" value={debug.code} />
          <DebugRow label="exchange 结果" value={debug.exchangeResult} />
          <DebugRow label="exchange 错误" value={debug.exchangeError} highlight={!!debug.exchangeError} />
          <DebugRow label="session (交换后)" value={debug.sessionAfterExchange} />
          <DebugRow label="getSession()" value={debug.getSessionResult} />
          <DebugRow label="getUser()" value={debug.getUserResult} />
          <DebugRow label="sb-* cookies" value={debug.cookies} />
          <DebugRow label="Supabase URL" value={process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '').slice(0, 30) || 'not set'} />
          <DebugRow label="目标页面" value={nextUrl.current} />
        </div>

        {ready && (
          <button
            onClick={() => router.replace(nextUrl.current)}
            className="mt-6 w-full py-3 rounded-xl text-sm font-bold"
            style={{ background: '#D4A843', color: '#080c10' }}
          >
            继续前往 {nextUrl.current}
          </button>
        )}

        {!ready && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-[#D4A843]" />
            <span className="text-sm text-gray-400">处理中...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DebugRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div className="rounded-lg p-3" style={{ background: highlight ? 'rgba(176,96,64,0.2)' : 'rgba(255,255,255,0.05)' }}>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#6a7a7e' }}>{label}</div>
      <div className="whitespace-pre-wrap break-all" style={{ color: highlight ? '#e88060' : '#e8e4dc' }}>{value}</div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080c10]">
        <div className="w-10 h-10 mx-auto rounded-full border-2 border-t-transparent animate-spin border-[#D4A843]" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
