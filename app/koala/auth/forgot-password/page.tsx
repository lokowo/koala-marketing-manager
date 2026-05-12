'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'email' | 'code' | 'newpass' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) setStep('code');
    else {
      const d = await res.json();
      setError(d.error || '发送失败');
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) { setError('请输入6位验证码'); return; }
    if (newPassword.length < 8) { setError('新密码至少8位'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || '重置失败'); return; }
    setStep('done');
    setTimeout(() => router.replace('/koala/auth'), 2000);
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#080c10]">
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-lg font-bold mb-2 text-gray-900 dark:text-[#e8e4dc]">密码重置成功</h1>
          <p className="text-sm text-gray-500 dark:text-[#6a7a7e]">正在跳转到登录页…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#080c10]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#e8e4dc]">
            {step === 'email' ? '忘记密码' : '重置密码'}
          </h1>
          <p className="text-sm mt-1 text-gray-500 dark:text-[#6a7a7e]">
            {step === 'email' ? '输入注册邮箱，我们将发送重置验证码' : `验证码已发送到 ${email}`}
          </p>
        </div>

        <form
          onSubmit={step === 'email' ? handleSendCode : handleReset}
          className="rounded-2xl p-6 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_4px_24px_rgba(125,99,64,0.08)]"
        >
          {step === 'email' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-[#a8b8ac]">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-[#D4A843]/[0.06] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-[#e8e4dc]"
                placeholder="your@email.com"
              />
            </div>
          )}

          {step === 'code' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-[#a8b8ac]">验证码</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-xl font-bold tracking-[6px] rounded-xl px-4 py-2.5 focus:outline-none bg-white dark:bg-[#D4A843]/[0.06] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-[#e8e4dc]"
                  placeholder="000000"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5 text-gray-500 dark:text-[#a8b8ac]">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white dark:bg-[#D4A843]/[0.06] border border-gray-300 dark:border-white/10 text-gray-900 dark:text-[#e8e4dc]"
                  placeholder="至少8位"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm mb-3 text-[#b06040]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-semibold text-sm disabled:opacity-50 transition bg-[#D4A843] text-[#080c10]"
          >
            {loading ? '处理中…' : step === 'email' ? '发送验证码' : '重置密码'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/koala/auth" className="text-xs no-underline text-gray-500 dark:text-[#6a7a7e]">
            ← 返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
