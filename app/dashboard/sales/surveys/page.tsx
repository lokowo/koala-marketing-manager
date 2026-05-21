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
  draft:  { label: '草稿',   color: '#6B7280', bg: '#F3F4F6' },
  active: { label: '进行中', color: '#166534', bg: '#DCFCE7' },
  paused: { label: '已暂停', color: '#92400E', bg: '#FEF3C7' },
  closed: { label: '已关闭', color: '#991B1B', bg: '#FEE2E2' },
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
          <h1 className="text-xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">问卷管理</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">创建、编辑和推广调研问卷</p>
        </div>
        <Link
          href="/dashboard/sales/surveys/create"
          className="px-4 py-2 rounded-lg text-xs font-medium text-white dark:text-[#0F172A] bg-[#111827] dark:bg-[#F1F5F9] no-underline hover:opacity-90 transition"
        >
          + 新建问卷
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex gap-0 -mb-px">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-[#F59E0B] text-[#111827] dark:text-[#F1F5F9]'
                  : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#374151] dark:hover:text-[#CBD5E1]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'promote' && (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] p-5">
          <h3 className="text-sm font-light tracking-tight text-[#374151] dark:text-[#CBD5E1] mb-2">我推广的问卷</h3>
          <p className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] mb-4">查看您的推广二维码效果和客户详情</p>
          {surveys.filter(s => s.status === 'active').length === 0 ? (
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">暂无可推广的问卷。请在「问卷广场」中选择问卷生成推广码。</p>
          ) : (
            <div className="space-y-2">
              {surveys.filter(s => s.status === 'active').map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F9FAFB] dark:hover:bg-[#334155] transition">
                  <span className="text-xs font-medium text-[#111827] dark:text-[#F1F5F9]">{s.title}</span>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/sales/surveys/${s.id}/share`}
                      className="px-3 py-1 text-[10px] rounded-lg font-medium text-[#166534] bg-[#DCFCE7] no-underline"
                    >
                      推广码
                    </Link>
                    <Link
                      href={`/dashboard/sales/surveys/${s.id}/clients`}
                      className="px-3 py-1 text-[10px] rounded-lg font-medium text-[#374151] dark:text-[#CBD5E1] bg-[#F3F4F6] dark:bg-[#334155] no-underline"
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
          {/* Search + filter */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索问卷名称..."
              className="flex-1 max-w-xs border border-[#E5E7EB] dark:border-[#334155] rounded-lg px-3 py-2.5 text-xs text-[#111827] dark:text-[#F1F5F9] bg-white dark:bg-[#0F172A] placeholder:text-[#9CA3AF] dark:placeholder:text-[#64748B] focus:outline-none focus:border-[#F59E0B]"
            />
            {tab === 'mine' && (
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-[#E5E7EB] dark:border-[#334155] rounded-lg px-3 py-2.5 text-xs bg-white dark:bg-[#0F172A] text-[#374151] dark:text-[#CBD5E1] focus:outline-none"
              >
                <option value="">全部状态</option>
                <option value="draft">草稿</option>
                <option value="active">进行中</option>
                <option value="paused">已暂停</option>
                <option value="closed">已关闭</option>
              </select>
            )}
            <span className="text-[10px] text-[#9CA3AF] dark:text-[#64748B]">共 {total} 份</span>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">加载中...</p>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155]">
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mb-4">{tab === 'plaza' ? '暂无已发布的问卷' : '还没有问卷'}</p>
              {tab === 'mine' && (
                <Link
                  href="/dashboard/sales/surveys/create"
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white dark:text-[#0F172A] bg-[#111827] dark:bg-[#F1F5F9] no-underline"
                >
                  创建第一份问卷
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F9FAFB] dark:bg-[#0F172A] text-[#6B7280] dark:text-[#94A3B8]">
                      <th className="text-left px-4 py-2.5 font-medium">问卷名称</th>
                      <th className="text-center px-4 py-2.5 font-medium w-24">状态</th>
                      <th className="text-center px-4 py-2.5 font-medium w-20">回复</th>
                      <th className="text-left px-4 py-2.5 font-medium w-28">创建时间</th>
                      <th className="text-right px-4 py-2.5 font-medium w-56">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#334155]">
                    {surveys.map(s => {
                      const st = STATUS_MAP[s.status] || STATUS_MAP.draft;
                      const isOwner = s.created_by === userId;
                      return (
                        <tr key={s.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#334155]">
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/sales/surveys/${s.id}/edit`} className="text-[#111827] dark:text-[#F1F5F9] hover:text-[#F59E0B] no-underline font-medium text-xs">
                              {s.title}
                            </Link>
                            {s.description && <p className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] mt-0.5 truncate max-w-xs">{s.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: st.color, backgroundColor: st.bg }}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-[#374151] dark:text-[#CBD5E1]">{s.response_count ?? '—'}</td>
                          <td className="px-4 py-3 text-[#6B7280] dark:text-[#94A3B8]">{new Date(s.created_at).toLocaleDateString('zh-CN')}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-1 justify-end flex-wrap">
                              <Link
                                href={`/dashboard/sales/surveys/${s.id}/responses`}
                                className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#FFFBEB] text-[#F59E0B] no-underline font-medium"
                              >
                                回复
                              </Link>
                              {(isOwner || (tab === 'plaza' && s.status === 'active')) && (
                                <Link
                                  href={`/dashboard/sales/surveys/${s.id}/edit`}
                                  className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] no-underline"
                                >
                                  编辑
                                </Link>
                              )}
                              {s.status === 'active' && (
                                <Link
                                  href={`/dashboard/sales/surveys/${s.id}/share`}
                                  className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#F0FDF4] text-[#166534] no-underline font-medium"
                                >
                                  推广
                                </Link>
                              )}
                              {isOwner && s.status === 'draft' && (
                                <button onClick={() => handleStatusChange(s.id, 'active')} className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#F0FDF4] text-[#166534]">
                                  发布
                                </button>
                              )}
                              {s.status === 'draft' && tab !== 'plaza' && (
                                <span className="px-2 py-1 text-[10px] text-[#D1D5DB]">请先发布</span>
                              )}
                              {isOwner && s.status === 'active' && (
                                <button onClick={() => handleStatusChange(s.id, 'paused')} className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#FFFBEB] text-[#F59E0B]">
                                  暂停
                                </button>
                              )}
                              {isOwner && s.status === 'paused' && (
                                <button onClick={() => handleStatusChange(s.id, 'active')} className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#F0FDF4] text-[#166534]">
                                  恢复
                                </button>
                              )}
                              {isOwner && (s.status === 'active' || s.status === 'paused') && (
                                <button onClick={() => { if (confirm('确定要结束这份问卷吗？结束后将无法继续收集回复。')) handleStatusChange(s.id, 'closed'); }} className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#FEF2F2] text-[#991B1B]">
                                  结束
                                </button>
                              )}
                              <button onClick={() => handleDuplicate(s.id)} className="px-2 py-1 text-[10px] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]">
                                复制
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {total > 20 && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-[#F3F4F6] dark:border-[#334155]">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-[#9CA3AF] dark:text-[#64748B]">{page} / {Math.ceil(total / 20)}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(total / 20)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] disabled:opacity-40"
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
  return <Suspense fallback={<p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">加载中...</p>}><SurveysContent /></Suspense>;
}
