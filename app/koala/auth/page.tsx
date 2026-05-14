'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';

type Step = 'form' | 'verify' | 'success';
type Mode = 'login' | 'register';

function mapAuthError(msg: string): string {
  if (msg.includes('rate limit') || msg.includes('Rate limit'))
    return '操作过于频繁，请稍后再试';
  if (msg.includes('User already registered'))
    return '该邮箱已注册，请直接登录';
  if (msg.includes('Invalid login credentials'))
    return '邮箱或密码错误';
  if (msg.includes('Email not confirmed'))
    return '邮箱未验证，请先完成验证';
  return msg;
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080c10]">
        <div className="animate-pulse text-sm text-gray-500 dark:text-[#6a7a7e]">加载中…</div>
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const salesCode = searchParams.get('sales') || '';
  const [mode, setMode] = useState<Mode>('register');
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [referralInput, setReferralInput] = useState(refCode);
  const [dataConsent, setDataConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const autoVerifyDone = useRef(false);

  // Auto-verify when arriving from email link (?mode=verify&email=...&code=...)
  useEffect(() => {
    if (autoVerifyDone.current) return;
    const urlMode = searchParams.get('mode');
    const urlEmail = searchParams.get('email');
    const urlCode = searchParams.get('code');
    if (urlMode === 'verify' && urlEmail) {
      setEmail(urlEmail);
      setStep('verify');
      if (urlCode && urlCode.length === 6) {
        autoVerifyDone.current = true;
        setCode(urlCode);
        setLoading(true);
        fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: urlEmail, code: urlCode }),
        })
          .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
          .then(({ ok, data }) => {
            setLoading(false);
            if (!ok) { setError(data.error || '验证失败'); return; }
            if (referralInput) {
              fetch('/api/user/referral/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: referralInput }),
              }).catch(() => {});
            }
            if (salesCode) {
              fetch('/api/sales/track-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salesCode, email: urlEmail }),
              }).catch(() => {});
            }
            setStep('success');
            // No password available from email link — redirect to login
            setTimeout(() => {
              setStep('form');
              setMode('login');
              setError('');
            }, 2000);
          })
          .catch(() => { setLoading(false); setError('验证请求失败'); });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('密码至少8位'); return; }
    if (!dataConsent) { setError('请同意数据授权后继续注册'); return; }
    setLoading(true);

    // Register via server API — avoids Supabase sending its own confirmation email
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: undefined,
        referralCode: referralInput || undefined,
        salesCode: salesCode || undefined,
        dataConsent: true,
      }),
    });

    setLoading(false);
    const d = await res.json();
    if (!res.ok) {
      setError(mapAuthError(d.error || '注册失败'));
      return;
    }

    setStep('verify');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (loginErr) {
      setError(mapAuthError(loginErr.message));
      return;
    }

    router.replace('/koala/home');
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) { setError('请输入6位验证码'); return; }
    setLoading(true);

    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || '验证失败');
      return;
    }

    // Sign in the user now that email is confirmed
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setError('验证成功，但自动登录失败，请手动登录');
      setMode('login');
      setStep('form');
      return;
    }

    if (referralInput) {
      try {
        await fetch('/api/user/referral/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: referralInput }),
        });
      } catch {
        console.error('[auth] referral claim failed');
      }
    }

    if (salesCode) {
      fetch('/api/sales/track-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesCode, email }),
      }).catch(() => {});
    }

    setStep('success');
    setTimeout(() => router.replace('/koala/home'), 2000);
  }

  async function handleResend() {
    setError('');
    setLoading(true);
    await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setError('验证码已重新发送，请查收邮箱');
  }

  // --- Success ---
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#080c10]">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-[#e8e4dc]">验证成功！</h1>
          <p className="text-sm mb-6 text-gray-500 dark:text-[#6a7a7e]">欢迎加入 Koala PhD，正在跳转…</p>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-t-transparent animate-spin border-[#D4A843]" />
        </div>
      </div>
    );
  }

  // --- Verify Code ---
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#080c10]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-3xl mb-3">📧</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-[#e8e4dc]">验证你的邮箱</h1>
            <p className="text-sm mt-2 text-gray-500 dark:text-[#6a7a7e]">
              验证码已发送到 <span className="font-medium text-gray-600 dark:text-[#a8b8ac]">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="rounded-2xl p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_4px_24px_rgba(125,99,64,0.08)]">
            <label className="block text-sm font-medium mb-2 text-gray-500 dark:text-[#a8b8ac]">6位验证码</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl font-bold tracking-[8px] rounded-xl px-4 py-3 focus:outline-none bg-white dark:bg-[#D4A843]/10 border-2 border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#e8e4dc]"
              placeholder="000000"
              autoFocus
            />

            {error && <p className={`text-sm mt-3 ${error.includes('已重新发送') ? 'text-[#5a8060]' : 'text-[#b06040]'}`}>{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full mt-4 py-3 rounded-full font-semibold text-sm disabled:opacity-50 transition bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
            >
              {loading ? '验证中…' : '确认验证'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full mt-3 py-2 text-sm font-medium disabled:opacity-50 bg-transparent text-gray-500 dark:text-[#6a7a7e]"
            >
              没收到？重新发送验证码
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Login / Register Form ---
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#080c10]">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-14 mx-auto rounded-2xl flex items-center justify-center mb-3 bg-gray-100 dark:bg-[#e8e4dc]">
            <span className="text-2xl">🐨</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#e8e4dc]">
            {mode === 'register' ? '注册 Koala Study' : '登录 Koala Study'}
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-[#6a7a7e]">
            {mode === 'register' ? '免费开始，发现你的理想导师' : '欢迎回来'}
          </p>
        </div>

        {/* Referral banner */}
        {refCode && (
          <div className="mb-4 px-4 py-2 rounded-lg text-xs text-center bg-green-50 dark:bg-[rgba(90,128,96,0.1)] text-green-700 dark:text-[#5a8060] border border-green-200 dark:border-[rgba(90,128,96,0.2)]">
            🎁 你的朋友邀请你加入 Koala PhD，注册后双方各得积分！
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex mb-6 rounded-full p-1 bg-gray-100 dark:bg-[#D4A843]/10">
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
              mode === 'register'
                ? 'bg-white dark:bg-white text-gray-900 dark:text-[#080c10] shadow-sm'
                : 'bg-transparent text-gray-500 dark:text-[#6a7a7e]'
            }`}
          >
            注册
          </button>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-white dark:bg-white text-gray-900 dark:text-[#080c10] shadow-sm'
                : 'bg-transparent text-gray-500 dark:text-[#6a7a7e]'
            }`}
          >
            登录
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={mode === 'register' ? handleRegister : handleLogin}
          className="rounded-2xl p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_4px_24px_rgba(125,99,64,0.08)]"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-[#a8b8ac]">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-[#D4A843]/10 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-[#e8e4dc]"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-[#a8b8ac]">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-[#D4A843]/10 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-[#e8e4dc]"
              placeholder={mode === 'register' ? '至少8位' : '••••••••'}
            />
          </div>

          {mode === 'register' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-[#a8b8ac]">邀请码（选填，双方各得积分）</label>
              <input
                type="text"
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none tracking-wider bg-gray-50 dark:bg-[#0F1419] border border-gray-300 dark:border-[#D4A843]/20 text-gray-900 dark:text-[#e8e4dc] font-mono"
                placeholder="例：VPB89N"
              />
              {referralInput && (
                <p className="text-[11px] mt-1.5 px-1 text-[#5a8060]">
                  🎁 注册成功后你将额外获得 5 积分
                </p>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right mb-4">
              <Link href="/koala/auth/forgot-password" className="text-xs no-underline text-[#1A1A2E] dark:text-[#D4A843]">
                忘记密码？
              </Link>
            </div>
          )}

          {error && <p className="text-sm mb-3 text-[#b06040]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-semibold text-sm disabled:opacity-50 transition bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
          >
            {loading ? '处理中…' : mode === 'register' ? '注册并验证邮箱' : '登录'}
          </button>

          {mode === 'register' && (
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dataConsent}
                  onChange={e => setDataConsent(e.target.checked)}
                  className="mt-0.5 rounded accent-[#D4A843]"
                />
                <span className="text-[11px] leading-relaxed text-gray-400 dark:text-[#8a8078]">
                  我授权 Koala Study 使用我的个人资料、上传文件及对话内容，用于 AI 教授匹配和个性化申请信生成。我的数据将被安全存储，仅用于平台服务。
                </span>
              </label>
              <p className="text-[10px] text-center text-gray-500 dark:text-[#6a7a7e]">
                注册即表示同意我们的服务条款和隐私政策
              </p>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link href="/koala/home" className="text-xs no-underline text-gray-500 dark:text-[#6a7a7e]">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
