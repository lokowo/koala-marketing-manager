'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

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
    e.stopPropagation(); // prevent row click
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">加载中…</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-sm p-4">{error}</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">用户管理</h1>
        <p className="text-slate-500 text-sm mt-1">
          共 {users.length} 位用户 · 点击行查看用户详情
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">邮箱</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">注册时间</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">最后登录</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">权限</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isSelf = user.id === myId;
              const isSuperAdmin = user.role === 'super_admin';
              const locked = isSelf || isSuperAdmin;

              return (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/koala/users/${user.id}`)}
                >
                  <td className="px-4 py-3 text-slate-800 font-medium">
                    {user.email}
                    {isSelf && <span className="ml-2 text-xs text-emerald-600">(你)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString('zh-CN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {locked ? (
                      <span className="inline-block px-2 py-1 rounded text-xs bg-slate-100 text-slate-500">
                        {user.role ? ROLE_LABELS[user.role] : '无权限'}
                      </span>
                    ) : (
                      <select
                        value={user.role ?? ''}
                        disabled={saving === user.id}
                        onChange={e => updateRole(e as unknown as React.MouseEvent, user.id, e.target.value as UserRole)}
                        onClick={e => e.stopPropagation()}
                        className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
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
