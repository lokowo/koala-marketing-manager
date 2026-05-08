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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
        <div className="animate-pulse text-sm" style={{ color: '#6a7a7e' }}>加载中…</div>
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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#e8e4dc' }}>验证成功！</h1>
          <p className="text-sm mb-6" style={{ color: '#6a7a7e' }}>欢迎加入 Koala PhD，正在跳转…</p>
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#c9a96e', borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  // --- Verify Code ---
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-3xl mb-3">📧</div>
            <h1 className="text-xl font-bold" style={{ color: '#e8e4dc' }}>验证你的邮箱</h1>
            <p className="text-sm mt-2" style={{ color: '#6a7a7e' }}>
              验证码已发送到 <span className="font-medium" style={{ color: '#a8b8ac' }}>{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)', boxShadow: '0 4px 24px rgba(125,99,64,0.08)' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: '#a8b8ac' }}>6位验证码</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl font-bold tracking-[8px] rounded-xl px-4 py-3 focus:outline-none"
              style={{ background: 'rgba(201,169,110,0.06)', border: '2px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
              placeholder="000000"
              autoFocus
            />

            {error && <p className="text-sm mt-3" style={{ color: error.includes('已重新发送') ? '#5a8060' : '#b06040' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full mt-4 py-3 rounded-full font-semibold text-sm disabled:opacity-50 transition"
              style={{ background: '#c9a96e', color: '#e8e4dc' }}
            >
              {loading ? '验证中…' : '确认验证'}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full mt-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{ color: '#6a7a7e' }}
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: '#e8e4dc' }}>
            <span className="text-2xl">🐨</span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#e8e4dc' }}>
            {mode === 'register' ? '注册 Koala Study' : '登录 Koala Study'}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6a7a7e' }}>
            {mode === 'register' ? '免费开始，发现你的理想导师' : '欢迎回来'}
          </p>
        </div>

        {/* Referral banner */}
        {refCode && (
          <div className="mb-4 px-4 py-2 rounded-lg text-xs text-center"
            style={{ background: 'rgba(90,128,96,0.1)', color: '#5a8060', border: '1px solid rgba(90,128,96,0.2)' }}>
            🎁 你的朋友邀请你加入 Koala PhD，注册后双方各得积分！
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex mb-6 rounded-full p-1" style={{ background: 'rgba(201,169,110,0.06)' }}>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className="flex-1 py-2 rounded-full text-sm font-medium transition"
            style={{ background: mode === 'register' ? '#fff' : 'transparent', color: mode === 'register' ? '#e8e4dc' : '#6a7a7e', boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}
          >
            注册
          </button>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className="flex-1 py-2 rounded-full text-sm font-medium transition"
            style={{ background: mode === 'login' ? '#fff' : 'transparent', color: mode === 'login' ? '#e8e4dc' : '#6a7a7e', boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}
          >
            登录
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={mode === 'register' ? handleRegister : handleLogin}
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)', boxShadow: '0 4px 24px rgba(125,99,64,0.08)' }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#a8b8ac' }}>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#a8b8ac' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
              placeholder={mode === 'register' ? '至少8位' : '••••••••'}
            />
          </div>

          {mode === 'register' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#a8b8ac' }}>邀请码（选填，双方各得积分）</label>
              <input
                type="text"
                value={referralInput}
                onChange={e => setReferralInput(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none tracking-wider"
                style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.2)', color: '#e8e4dc', fontFamily: 'monospace' }}
                placeholder="例：VPB89N"
              />
              {referralInput && (
                <p className="text-[11px] mt-1.5 px-1" style={{ color: '#5a8060' }}>
                  🎁 注册成功后你将额外获得 5 积分
                </p>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right mb-4">
              <Link href="/koala/auth/forgot-password" className="text-xs no-underline" style={{ color: '#c9a96e' }}>
                忘记密码？
              </Link>
            </div>
          )}

          {error && <p className="text-sm mb-3" style={{ color: '#b06040' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-semibold text-sm disabled:opacity-50 transition"
            style={{ background: '#c9a96e', color: '#e8e4dc' }}
          >
            {loading ? '处理中…' : mode === 'register' ? '注册并验证邮箱' : '登录'}
          </button>

          {mode === 'register' && (
            <p className="text-[11px] mt-4 text-center leading-relaxed" style={{ color: '#6a7a7e' }}>
              注册即表示同意我们的服务条款和隐私政策
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link href="/koala/home" className="text-xs no-underline" style={{ color: '#6a7a7e' }}>
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
