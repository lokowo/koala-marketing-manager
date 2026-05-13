'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  share_code: string;
  response_count?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#94a3b8', bg: '#f1f5f9' },
  active: { label: '进行中', color: '#22c55e', bg: '#f0fdf4' },
  paused: { label: '已暂停', color: '#f59e0b', bg: '#fffbeb' },
  closed: { label: '已关闭', color: '#ef4444', bg: '#fef2f2' },
};

type Tab = 'mine' | 'plaza' | 'promote';

function SurveysContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'mine';

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    fetch('/api/admin/me').then(r => r.json()).then(d => {
      setUserId(d.id || d.userId || '');
    }).catch(() => {});
  }, []);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (tab === 'plaza') params.set('status', 'active');

    const res = await fetch(`/api/surveys?${params}`);
    if (res.ok) {
      const data = await res.json();
      let items = data.surveys || [];
      if (tab === 'mine' && userId) {
        items = items.filter((s: Survey) => s.created_by === userId);
      }
      setSurveys(items);
      setTotal(tab === 'mine' ? items.length : data.total || 0);
    }
    setLoading(false);
  }, [page, search, statusFilter, tab, userId]);

  useEffect(() => { if (userId || tab === 'plaza') fetchSurveys(); }, [fetchSurveys, userId, tab]);

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'mine', label: '我的问卷' },
    { key: 'plaza', label: '问卷广场' },
    { key: 'promote', label: '我的推广' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">问卷管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">创建、编辑和推广调研问卷</p>
        </div>
        <Link
          href="/dashboard/sales/surveys/create"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white no-underline"
          style={{ backgroundColor: '#D4A843' }}
        >
          + 新建问卷
        </Link>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'text-amber-600 border-amber-500'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'promote' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">我推广的问卷</h3>
          <p className="text-xs text-slate-400 mb-4">查看您的推广二维码效果和客户详情</p>
          {surveys.filter(s => s.status === 'active').length === 0 ? (
            <p className="text-sm text-slate-400">暂无可推广的问卷。请在「问卷广场」中选择问卷生成推广码。</p>
          ) : (
            <div className="space-y-2">
              {surveys.filter(s => s.status === 'active').map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <span className="text-sm text-slate-700">{s.title}</span>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/sales/surveys/${s.id}/share`}
                      className="px-3 py-1 text-xs rounded-lg font-medium text-teal-600 bg-teal-50 no-underline"
                    >
                      推广码
                    </Link>
                    <Link
                      href={`/dashboard/sales/surveys/${s.id}/clients`}
                      className="px-3 py-1 text-xs rounded-lg font-medium text-slate-600 bg-slate-100 no-underline"
                    >
                      客户详情
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(tab === 'mine' || tab === 'plaza') && (
        <>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索问卷名称..."
              className="flex-1 max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            {tab === 'mine' && (
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
            )}
            <span className="text-sm text-slate-400">共 {total} 份</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">加载中...</div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-500 text-sm mb-4">{tab === 'plaza' ? '暂无已发布的问卷' : '还没有问卷'}</p>
              {tab === 'mine' && (
                <Link
                  href="/dashboard/sales/surveys/create"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white no-underline"
                  style={{ backgroundColor: '#D4A843' }}
                >
                  创建第一份问卷
                </Link>
              )}
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
                    <th className="px-4 py-3 text-slate-500 font-medium w-56 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map(s => {
                    const st = STATUS_MAP[s.status] || STATUS_MAP.draft;
                    const isOwner = s.created_by === userId;
                    return (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/sales/surveys/${s.id}/edit`} className="text-slate-800 hover:text-amber-600 no-underline font-medium">
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
                          <div className="flex items-center gap-1 justify-end flex-wrap">
                            {(isOwner || (tab === 'plaza' && s.status === 'active')) && (
                              <Link
                                href={`/dashboard/sales/surveys/${s.id}/edit`}
                                className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500 no-underline"
                              >
                                编辑
                              </Link>
                            )}
                            {s.status === 'active' && (
                              <Link
                                href={`/dashboard/sales/surveys/${s.id}/share`}
                                className="px-2 py-1 text-xs rounded hover:bg-teal-50 text-teal-600 no-underline font-medium"
                              >
                                推广
                              </Link>
                            )}
                            {isOwner && s.status === 'draft' && (
                              <button onClick={() => handleStatusChange(s.id, 'active')} className="px-2 py-1 text-xs rounded hover:bg-green-50 text-green-600">
                                发布
                              </button>
                            )}
                            {s.status === 'draft' && tab !== 'plaza' && (
                              <span className="px-2 py-1 text-xs text-slate-300">请先发布</span>
                            )}
                            {isOwner && s.status === 'active' && (
                              <button onClick={() => { if (confirm('确定要结束这份问卷吗？结束后将无法继续收集回复。')) handleStatusChange(s.id, 'closed'); }} className="px-2 py-1 text-xs rounded hover:bg-red-50 text-red-500">
                                结束
                              </button>
                            )}
                            <button onClick={() => handleDuplicate(s.id)} className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500">
                              复制
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

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
        </>
      )}
    </div>
  );
}

export default function SalesSurveysPage() {
  return <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">加载中...</div>}><SurveysContent /></Suspense>;
}
