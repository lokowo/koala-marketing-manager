'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard/koala');
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonKey } })
        .then(r => r.json())
        .then(settings => { if (settings?.external?.google) setGoogleEnabled(true); })
        .catch(() => {});
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    const from = searchParams.get('from') ?? '/dashboard/koala';
    router.replace(from);
  }

  async function handleGoogle() {
    const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/koala/auth/callback?next=/dashboard/koala`,
        skipBrowserRedirect: true,
      },
    });
    if (oauthErr || !data?.url) {
      setError('Google 登录暂不可用，请使用邮箱登录');
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-8 space-y-5 border border-white/10">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-medium transition bg-white text-gray-700 hover:shadow-md hover:bg-gray-50"
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.53l7.97-5.94z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.94C6.51 42.62 14.62 48 24 48z"/></svg>
            使用 Google 账号登录
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500">或</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </>
      )}

    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm text-slate-300 mb-1.5">邮箱</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1.5">密码</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition"
      >
        {loading ? '登录中…' : '登录'}
      </button>
    </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-emerald-400 text-sm mb-2">Koala Marketing Manager</p>
          <h1 className="text-2xl font-bold text-white">管理后台登录</h1>
        </div>
        <Suspense fallback={<div className="h-48 bg-slate-900 rounded-2xl border border-white/10" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
