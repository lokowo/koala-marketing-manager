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
    if (action === 'reject' && !confirm('确定要拒绝此申请吗？此操作不可撤销。')) return;
    setActionLoading(appId);
    try {
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, action, rejectReason: action === 'reject' ? rejectReason : undefined }),
      });
    } catch (err) {
      alert((err as Error).message || '操作失败');
    }
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
      <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100 mb-4">角色管理</h1>

      <div className="flex gap-2 mb-4">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t ? 'bg-gray-800 dark:bg-gray-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {{ pending: '待审核', approved: '已通过', rejected: '已拒绝', all: '全部' }[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中…</p>
      ) : apps.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">暂无申请</p>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{app.full_name || app.user_profiles?.display_name || app.email || app.user_profiles?.email || app.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{app.email || app.user_profiles?.email}</p>
                  {(app.phone || app.user_profiles?.phone) && <p className="text-xs text-gray-500 dark:text-gray-400">Tel: {app.phone || app.user_profiles?.phone}</p>}
                  {app.company && <p className="text-xs text-gray-500 dark:text-gray-400">公司: {app.company}</p>}
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
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">{app.reason}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">{new Date(app.created_at).toLocaleString('zh-CN')}</p>

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
                        className="flex-1 rounded-lg px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 focus:outline-none"
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
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50"
                    >
                      拒绝
                    </button>
                  )}
                </div>
              )}
              {app.status === 'approved' && (
                <button
                  onClick={() => handleRevoke(app.user_id)}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50"
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
