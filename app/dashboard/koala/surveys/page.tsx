'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  share_code: string;
  response_count?: number;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#94a3b8', bg: '#f1f5f9' },
  active: { label: '进行中', color: '#22c55e', bg: '#f0fdf4' },
  paused: { label: '已暂停', color: '#f59e0b', bg: '#fffbeb' },
  closed: { label: '已关闭', color: '#ef4444', bg: '#fef2f2' },
};

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/surveys?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSurveys(data.surveys || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/surveys/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchSurveys();
  }

  async function handleDuplicate(id: string) {
    await fetch('/api/surveys/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchSurveys();
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这份问卷吗？此操作不可撤销。')) return;
    await fetch('/api/surveys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchSurveys();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">问卷管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">创建、管理和分析调研问卷</p>
        </div>
        <Link
          href="/dashboard/koala/surveys/create"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white no-underline"
          style={{ backgroundColor: '#D4A843' }}
        >
          + 新建问卷
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="搜索问卷名称..."
          className="flex-1 max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="active">进行中</option>
          <option value="paused">已暂停</option>
          <option value="closed">已关闭</option>
        </select>
        <span className="text-sm text-slate-400">共 {total} 份</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">加载中...</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-slate-500 text-sm mb-4">还没有问卷</p>
          <Link
            href="/dashboard/koala/surveys/create"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white no-underline"
            style={{ backgroundColor: '#D4A843' }}
          >
            创建第一份问卷
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-slate-500 font-medium">问卷名称</th>
                <th className="px-4 py-3 text-slate-500 font-medium w-24">状态</th>
                <th className="px-4 py-3 text-slate-500 font-medium w-20 text-center">回复数</th>
                <th className="px-4 py-3 text-slate-500 font-medium w-32">创建时间</th>
                <th className="px-4 py-3 text-slate-500 font-medium w-48 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map(s => {
                const st = STATUS_MAP[s.status] || STATUS_MAP.draft;
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/koala/surveys/edit?id=${s.id}`} className="text-slate-800 hover:text-amber-600 no-underline font-medium">
                        {s.title}
                      </Link>
                      {s.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{s.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ color: st.color, backgroundColor: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{s.response_count ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/dashboard/koala/surveys/edit?id=${s.id}`}
                          className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500 no-underline"
                        >
                          编辑
                        </Link>
                        <Link
                          href={`/dashboard/koala/surveys/analytics?id=${s.id}`}
                          className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500 no-underline"
                        >
                          分析
                        </Link>
                        {s.status === 'draft' && (
                          <button onClick={() => handleStatusChange(s.id, 'active')} className="px-2 py-1 text-xs rounded hover:bg-green-50 text-green-600">
                            发布
                          </button>
                        )}
                        {s.status === 'active' && (
                          <button onClick={() => handleStatusChange(s.id, 'paused')} className="px-2 py-1 text-xs rounded hover:bg-amber-50 text-amber-600">
                            暂停
                          </button>
                        )}
                        {s.status === 'paused' && (
                          <button onClick={() => handleStatusChange(s.id, 'active')} className="px-2 py-1 text-xs rounded hover:bg-green-50 text-green-600">
                            恢复
                          </button>
                        )}
                        <button onClick={() => handleDuplicate(s.id)} className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500">
                          复制
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="px-2 py-1 text-xs rounded hover:bg-red-50 text-red-400">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-100">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-sm text-slate-400">{page} / {Math.ceil(total / 20)}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1 rounded text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
