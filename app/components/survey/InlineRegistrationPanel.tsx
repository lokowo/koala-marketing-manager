'use client';

import { useState } from 'react';

interface InlineRegistrationPanelProps {
  getContactData: () => { name: string; phone: string; email: string };
  shareCode: string;
  responseId: string;
  onRegistered: (userId: string) => void;
}

type PanelState = 'collapsed' | 'expanded' | 'success';

export default function InlineRegistrationPanel({ getContactData, shareCode, responseId, onRegistered }: InlineRegistrationPanelProps) {
  const [state, setState] = useState<PanelState>('collapsed');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    const contact = getContactData();
    if (!contact.email) {
      setError('请先在上方填写邮箱');
      return;
    }
    if (!password || password.length < 6) {
      setError('密码至少6位');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/surveys/public/${shareCode}/respond/${responseId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contact.email,
          password,
          full_name: contact.name,
          phone: contact.phone,
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
      onRegistered(data.user_id || 'registered');
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (state === 'success') {
    return (
      <div style={{ marginTop: 16, padding: 16, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎉</span>
          <span style={{ fontSize: 14, color: '#22c55e', fontWeight: 500 }}>注册成功！20 积分已到账，请继续完成问卷</span>
        </div>
      </div>
    );
  }

  if (state === 'collapsed') {
    return (
      <div style={{ marginTop: 16, padding: 14, background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 12 }}>
        <p style={{ fontSize: 13, color: '#D4A843', margin: '0 0 8px 0' }}>
          💡 完成问卷后可注册领取 20 积分，或者——
        </p>
        <button
          type="button"
          onClick={() => setState('expanded')}
          style={{
            background: 'none', border: 'none', color: '#D4A843', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, padding: 0, textDecoration: 'underline',
          }}
        >
          现在就注册？填完问卷积分立即到账 →
        </button>
      </div>
    );
  }

  const contact = getContactData();

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'rgba(15,20,25,0.6)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#D4A843' }}>快速注册</h4>
        <button
          type="button"
          onClick={() => setState('collapsed')}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 12 }}
        >
          收起
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 10px 0' }}>
        📧 邮箱：<strong style={{ color: '#fff' }}>{contact.email || '请先填写邮箱'}</strong>
      </p>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="设置密码（至少6位）"
        style={{
          width: '100%', padding: '10px 12px', fontSize: 14,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, color: '#fff', outline: 'none', boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '6px 0 0 0' }}>{error}</p>}
      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        style={{
          width: '100%', padding: '10px 0', marginTop: 10,
          background: loading ? '#7d6340' : '#D4A843', color: '#080C10',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? '注册中...' : '注册并继续答题'}
      </button>
    </div>
  );
}
