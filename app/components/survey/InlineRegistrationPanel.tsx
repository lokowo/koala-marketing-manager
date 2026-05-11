'use client';

import { useState } from 'react';

interface InlineRegistrationPanelProps {
  email: string;
  salesCode?: string;
  onRegistered: (userId: string) => void;
}

type PanelState = 'collapsed' | 'expanded' | 'success';

export default function InlineRegistrationPanel({ email, salesCode, onRegistered }: InlineRegistrationPanelProps) {
  const [state, setState] = useState<PanelState>('collapsed');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!password || password.length < 8) {
      setError('密码至少8位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          salesCode,
          dataConsent: true,
        }),
      });
      if (res.status === 409) {
        setState('success');
        onRegistered('existing');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '注册失败');
      }
      const data = await res.json();
      setState('success');
      onRegistered(data.userId || 'registered');
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (state === 'success') {
    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-green-500 text-lg">✓</span>
          <span className="text-sm text-green-700 font-medium">账号已创建！验证邮件已发送到 {email}</span>
        </div>
      </div>
    );
  }

  if (state === 'collapsed') {
    return (
      <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200/60 rounded-xl">
        <p className="text-xs text-amber-700 mb-2">注册 Koala 账号，获取更多学术资源和专属服务</p>
        <button
          type="button"
          onClick={() => setState('expanded')}
          className="px-4 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ backgroundColor: '#D4A843' }}
        >
          免费注册
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-700">注册 Koala 账号</h4>
        <button type="button" onClick={() => setState('collapsed')} className="text-xs text-slate-400 hover:text-slate-600">收起</button>
      </div>
      <p className="text-xs text-slate-500 mb-3">邮箱: <strong>{email}</strong>（来自上方填写）</p>
      <div className="space-y-2">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="设置密码（至少8位）"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="确认密码"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#D4A843' }}
        >
          {loading ? '注册中...' : '一键注册'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">注册即表示同意我们的服务条款和隐私政策</p>
    </div>
  );
}
