'use client';

import { useEffect, useState } from 'react';

interface Application {
  id: string;
  user_id: string;
  applied_role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  reason: string;
  experience: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  user_profiles?: { display_name: string | null; email: string | null; avatar_url: string | null; phone: string | null } | null;
}

export default function RolesPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => { loadApps(); }, [tab]);

  async function loadApps() {
    setLoading(true);
    const res = await fetch(`/api/admin/roles?status=${tab}`);
    const d = await res.json();
    setApps(d.data ?? []);
    setLoading(false);
  }

  async function handleAction(appId: string, action: 'approve' | 'reject') {
    if (action === 'reject' && !rejectReason && rejectingId !== appId) {
      setRejectingId(appId);
      return;
    }
    setActionLoading(appId);
    await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId, action, rejectReason: action === 'reject' ? rejectReason : undefined }),
    });
    setActionLoading(null);
    setRejectingId(null);
    setRejectReason('');
    loadApps();
  }

  async function handleRevoke(userId: string) {
    if (!confirm('确定撤销此用户的角色？')) return;
    await fetch(`/api/admin/roles/${userId}`, { method: 'DELETE' });
    loadApps();
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">角色管理</h1>

      <div className="flex gap-2 mb-4">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {{ pending: '待审核', approved: '已通过', rejected: '已拒绝', all: '全部' }[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>
      ) : apps.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">暂无申请</p>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{app.full_name || app.user_profiles?.display_name || app.email || app.user_profiles?.email || app.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-slate-500">{app.email || app.user_profiles?.email}</p>
                  {(app.phone || app.user_profiles?.phone) && <p className="text-xs text-slate-500">Tel: {app.phone || app.user_profiles?.phone}</p>}
                  {app.company && <p className="text-xs text-slate-500">公司: {app.company}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    app.applied_role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {app.applied_role === 'admin' ? '管理员' : '销售'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    app.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {app.status === 'pending' ? '待审核' : app.status === 'approved' ? '已通过' : '已拒绝'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2">{app.reason}</p>
              <p className="text-[10px] text-slate-400 mt-2">{new Date(app.created_at).toLocaleString('zh-CN')}</p>

              {app.status === 'pending' && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    disabled={actionLoading === app.id}
                    onClick={() => handleAction(app.id, 'approve')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    通过
                  </button>
                  {rejectingId === app.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        placeholder="拒绝理由（选填）"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="flex-1 rounded-lg px-2 py-1.5 text-xs border border-slate-200 focus:outline-none"
                      />
                      <button
                        disabled={actionLoading === app.id}
                        onClick={() => handleAction(app.id, 'reject')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        确认拒绝
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAction(app.id, 'reject')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-red-600 border border-red-200 hover:bg-red-50"
                    >
                      拒绝
                    </button>
                  )}
                </div>
              )}
              {app.status === 'approved' && (
                <button
                  onClick={() => handleRevoke(app.user_id)}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-red-600 border border-red-200 hover:bg-red-50"
                >
                  撤销角色
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
