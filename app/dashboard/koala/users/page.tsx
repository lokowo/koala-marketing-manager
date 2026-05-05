'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ExternalLink, Filter, ChevronDown } from 'lucide-react';

type UserRole = 'super_admin' | 'admin' | 'viewer';

interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: UserRole | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  viewer: '只读',
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [myId, setMyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/admin/me');
      if (!meRes.ok) { router.replace('/dashboard/koala'); return; }
      const me = await meRes.json();
      if (me.role !== 'super_admin') { router.replace('/dashboard/koala'); return; }
      setMyId(me.userId);

      const res = await fetch('/api/admin/users');
      if (!res.ok) { setError('加载失败'); setLoading(false); return; }
      const { users } = await res.json();
      setUsers(users);
      setLoading(false);
    }
    load();
  }, [router]);

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
      alert(data.error ?? '操作失败');
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    }
    setSaving(null);
  }

  const now = new Date();
  const filtered = users.filter(u => {
    if (search) {
      if (!(u.email || '').toLowerCase().includes(search.toLowerCase())) return false;
    }
    if (timeFilter === '7d') {
      const d = new Date(u.created_at);
      if (now.getTime() - d.getTime() > 7 * 86400000) return false;
    } else if (timeFilter === '30d') {
      const d = new Date(u.created_at);
      if (now.getTime() - d.getTime() > 30 * 86400000) return false;
    }
    return true;
  });

  const todayCount = users.filter(u => {
    const d = new Date(u.created_at);
    return d.toDateString() === now.toDateString();
  }).length;

  const activeCount = users.filter(u => {
    if (!u.last_sign_in_at) return false;
    return now.getTime() - new Date(u.last_sign_in_at).getTime() < 7 * 86400000;
  }).length;

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-slate-400 text-sm">加载中...</p></div>;
  if (error) return <p className="text-red-400 text-sm p-4">{error}</p>;

  return (
    <div className="space-y-4">
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

      <div className="text-xs text-slate-400">显示 {filtered.length} / {users.length} 位用户</div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">邮箱</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">注册时间</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">最后登录</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">权限</th>
              <th className="px-4 py-3 text-xs" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => {
              const isSelf = user.id === myId;
              const isSuperAdmin = user.role === 'super_admin';
              const locked = isSelf || isSuperAdmin;

              return (
                <tr
                  key={user.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/koala/users/${user.id}`)}
                >
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
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString('zh-CN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {locked ? (
                      <span className="inline-block px-2 py-1 rounded text-[11px] bg-slate-100 text-slate-500">
                        {user.role ? ROLE_LABELS[user.role] : '无权限'}
                      </span>
                    ) : (
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
                        <option value="super_admin">超级管理员</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/koala/users/${user.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs no-underline"
                    >
                      详情 <ExternalLink className="size-3" />
                    </Link>
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
