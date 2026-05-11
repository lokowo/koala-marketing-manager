'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ExternalLink, Filter, ChevronDown, Trash2 } from 'lucide-react';

type UserRole = 'super_admin' | 'admin' | 'sales' | 'viewer';

interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: UserRole | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  sales: '销售',
  viewer: '只读',
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [myId, setMyId] = useState('');
  const [myRole, setMyRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/admin/me');
      if (!meRes.ok) { router.replace('/dashboard/koala'); return; }
      const me = await meRes.json();
      if (!['super_admin', 'admin'].includes(me.role)) { router.replace('/dashboard/koala'); return; }
      setMyId(me.userId);
      setMyRole(me.role);

      const res = await fetch('/api/admin/users');
      if (!res.ok) { setError('加载失败'); setLoading(false); return; }
      const { users: u } = await res.json();
      setUsers(u);
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function updateRole(e: React.MouseEvent, userId: string, role: UserRole) {
    e.stopPropagation();
    setSaving(userId);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error ?? '操作失败');
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setToast('角色已更新');
    }
    setSaving(null);
  }

  async function handleDelete(userId: string, email: string) {
    if (myRole === 'super_admin') {
      if (!confirm(`确定要删除用户 ${email}？此操作不可撤销。`)) return;
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setSelected(prev => { const n = new Set(prev); n.delete(userId); return n; });
        setToast('用户已删除');
      } else {
        setToast(data.error || '删除失败');
      }
    } else {
      const res = await fetch(`/api/admin/users/${userId}/delete-request`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setToast(data.status === 'deleted' ? '用户已删除' : '删除请求已提交，等待 Super Admin 确认');
      } else {
        setToast(data.error || '操作失败');
      }
    }
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除 ${selected.size} 个用户？此操作不可撤销。`)) return;
    setBatchDeleting(true);
    const res = await fetch('/api/admin/users/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [...selected] }),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers(prev => prev.filter(u => !selected.has(u.id)));
      setSelected(new Set());
      setToast(`已删除 ${data.deleted} 个用户${data.failed ? `，${data.failed} 个失败` : ''}`);
    } else {
      setToast(data.error || '批量删除失败');
    }
    setBatchDeleting(false);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const now = new Date();
  const filtered = users.filter(u => {
    if (search && !(u.email || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (timeFilter === '7d' && now.getTime() - new Date(u.created_at).getTime() > 7 * 86400000) return false;
    if (timeFilter === '30d' && now.getTime() - new Date(u.created_at).getTime() > 30 * 86400000) return false;
    return true;
  });

  const todayCount = users.filter(u => new Date(u.created_at).toDateString() === now.toDateString()).length;
  const activeCount = users.filter(u => u.last_sign_in_at && now.getTime() - new Date(u.last_sign_in_at).getTime() < 7 * 86400000).length;
  const isSuperAdmin = myRole === 'super_admin';

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-slate-400 text-sm">加载中...</p></div>;
  if (error) return <p className="text-red-400 text-sm p-4">{error}</p>;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg"
          style={{ background: toast.includes('失败') || toast.includes('错误') ? '#fee2e2' : '#d1fae5', color: toast.includes('失败') || toast.includes('错误') ? '#991b1b' : '#065f46' }}>
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">用户管理</h1>
        <p className="text-slate-500 text-sm mt-0.5">共 {users.length} 位用户</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{users.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">总用户 <span className="text-emerald-600">+{todayCount} 今日</span></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">7天活跃用户</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">—</div>
          <div className="text-xs text-slate-400 mt-0.5">有画像用户</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">—</div>
          <div className="text-xs text-slate-400 mt-0.5">本月申请信</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索邮箱..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
            showFilters ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="size-3.5" />
          筛选
          <ChevronDown className={`size-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-3 flex-wrap bg-slate-50 rounded-lg p-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">注册时间</label>
            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
              <option value="all">全部</option>
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">显示 {filtered.length} / {users.length} 位用户</div>
        {isSuperAdmin && selected.size > 0 && (
          <button
            onClick={handleBatchDelete}
            disabled={batchDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium"
          >
            <Trash2 className="size-3" />
            批量删除 ({selected.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {isSuperAdmin && <th className="w-10 px-3 py-3" />}
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">邮箱</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">注册时间</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs hidden sm:table-cell">最后登录</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">权限</th>
              <th className="px-4 py-3 text-xs" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => {
              const isSelf = user.id === myId;
              const isTargetSuperAdmin = user.role === 'super_admin';
              const locked = isSelf || isTargetSuperAdmin;
              const canDelete = !isSelf && !isTargetSuperAdmin;

              return (
                <tr
                  key={user.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/koala/users/${user.id}`)}
                >
                  {isSuperAdmin && (
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      {canDelete && (
                        <input
                          type="checkbox"
                          checked={selected.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="size-3.5 rounded border-slate-300"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {(user.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-800">{user.email}</span>
                        {isSelf && <span className="ml-1.5 text-[10px] text-emerald-600">(你)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString('zh-CN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {locked ? (
                      <span className="inline-block px-2 py-1 rounded text-[11px] bg-slate-100 text-slate-500">
                        {user.role ? ROLE_LABELS[user.role] || user.role : '无权限'}
                      </span>
                    ) : isSuperAdmin ? (
                      <select
                        value={user.role ?? ''}
                        disabled={saving === user.id}
                        onChange={e => updateRole(e as unknown as React.MouseEvent, user.id, e.target.value as UserRole)}
                        onClick={e => e.stopPropagation()}
                        className="border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                      >
                        <option value="">— 无权限 —</option>
                        <option value="viewer">只读</option>
                        <option value="admin">管理员</option>
                        <option value="sales">销售</option>
                        <option value="super_admin">超级管理员</option>
                      </select>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded text-[11px] bg-slate-100 text-slate-500">
                        {user.role ? ROLE_LABELS[user.role] || user.role : '无权限'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/koala/users/${user.id}`}
                        className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs no-underline"
                      >
                        详情 <ExternalLink className="size-3" />
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(user.id, user.email)}
                          className="text-red-400 hover:text-red-600 text-xs flex items-center gap-0.5"
                          title={isSuperAdmin ? '删除用户' : '申请删除'}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
