'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface WorkLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_profiles?: { display_name: string; email: string; avatar_url: string | null };
}

const ACTION_LABELS: Record<string, string> = {
  blog_generate: '生成博客',
  blog_generate_professor: '生成教授文章',
  professor_create: '创建教授',
  professor_delete: '删除教授',
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export default function WorkLogsPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [total, setTotal] = useState(0);
  const [admins, setAdmins] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (search) params.set('search', search);
    if (filterAction) params.set('action', filterAction);
    if (filterAdmin) params.set('userId', filterAdmin);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const res = await fetch(`/api/admin/work-logs?${params}`);
    const d = await res.json();
    setLogs(d.data ?? []);
    setTotal(d.total ?? 0);
    if (d.admins) setAdmins(prev => ({ ...prev, ...d.admins }));
    setLoading(false);
  }, [page, search, filterAction, filterAdmin, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  useEffect(() => { setPage(1); }, [search, filterAction, filterAdmin, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / 30);
  const adminList = Object.entries(admins);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">工作日志</h1>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索：如「删除 Jones」"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs border border-slate-200 focus:outline-none focus:border-amber-300"
            />
          </div>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-slate-200 focus:outline-none"
          >
            <option value="">全部操作</option>
            {ALL_ACTIONS.map(a => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
          <select
            value={filterAdmin}
            onChange={e => setFilterAdmin(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-slate-200 focus:outline-none"
          >
            <option value="">全部 Admin</option>
            {adminList.map(([uid, name]) => (
              <option key={uid} value={uid}>{name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-slate-200 focus:outline-none"
            title="开始日期"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs border border-slate-200 focus:outline-none"
            title="结束日期"
          />
          {(search || filterAction || filterAdmin || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setFilterAction(''); setFilterAdmin(''); setDateFrom(''); setDateTo(''); }}
              className="px-3 py-2 text-xs rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              清除
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">{total} 条记录</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">暂无匹配的日志</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-2.5 font-medium w-[130px]">时间</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作人</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作</th>
                  <th className="text-left px-4 py-2.5 font-medium">目标</th>
                  <th className="text-center px-4 py-2.5 font-medium w-[60px]">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <>
                    <tr key={log.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/dashboard/koala/work-logs?userId=${log.user_id}`}
                          className="text-slate-700 hover:text-amber-600 no-underline"
                          onClick={e => { e.stopPropagation(); setFilterAdmin(log.user_id); }}
                        >
                          {log.user_profiles?.display_name || log.user_profiles?.email || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {log.target_type}{log.target_id ? ` #${log.target_id.slice(0, 8)}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block transition-transform ${expandedId === log.id ? 'rotate-90' : ''}`}>▶</span>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={5} className="px-4 py-3 bg-slate-50">
                          <div className="text-xs space-y-1.5">
                            <div><span className="text-slate-400 w-16 inline-block">操作人 ID:</span> <span className="text-slate-600 font-mono text-[10px]">{log.user_id}</span></div>
                            <div><span className="text-slate-400 w-16 inline-block">目标类型:</span> <span className="text-slate-600">{log.target_type}</span></div>
                            {log.target_id && <div><span className="text-slate-400 w-16 inline-block">目标 ID:</span> <span className="text-slate-600 font-mono text-[10px]">{log.target_id}</span></div>}
                            <div><span className="text-slate-400 w-16 inline-block">完整时间:</span> <span className="text-slate-600">{new Date(log.created_at).toLocaleString('zh-CN')}</span></div>
                            {log.details && (
                              <div>
                                <span className="text-slate-400">详情:</span>
                                <pre className="mt-1 p-2 rounded bg-white border border-slate-200 text-[10px] text-slate-600 overflow-auto max-h-[200px] whitespace-pre-wrap">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded bg-white border border-slate-200 disabled:opacity-50">上一页</button>
              <span className="text-xs text-slate-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded bg-white border border-slate-200 disabled:opacity-50">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
