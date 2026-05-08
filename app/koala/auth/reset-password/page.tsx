'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('密码至少8位，且需包含字母和数字');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace('/koala/auth'), 2000);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-lg font-bold mb-2" style={{ color: '#e8e4dc' }}>密码已重置</h1>
          <p className="text-sm" style={{ color: '#6a7a7e' }}>正在跳转到登录页…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080c10' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold" style={{ color: '#e8e4dc' }}>设置新密码</h1>
          <p className="text-sm mt-1" style={{ color: '#6a7a7e' }}>请输入你的新密码</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)', boxShadow: '0 4px 24px rgba(125,99,64,0.08)' }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#a8b8ac' }}>新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
              placeholder="至少8位，包含字母和数字"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#a8b8ac' }}>确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: '#111c28', border: '1px solid rgba(201,169,110,0.1)', color: '#e8e4dc' }}
              placeholder="再次输入新密码"
            />
          </div>

          {error && <p className="text-sm mb-3" style={{ color: '#b06040' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-semibold text-sm disabled:opacity-50 transition"
            style={{ background: '#c9a96e', color: '#e8e4dc' }}
          >
            {loading ? '处理中…' : '重置密码'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/koala/auth" className="text-xs no-underline" style={{ color: '#6a7a7e' }}>
            ← 返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
