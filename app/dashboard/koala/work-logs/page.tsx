'use client';

import { useEffect, useState } from 'react';

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

export default function WorkLogsPage() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, [page]);

  async function loadLogs() {
    setLoading(true);
    const res = await fetch(`/api/admin/work-logs?page=${page}&limit=30`);
    const d = await res.json();
    setLogs(d.data ?? []);
    setTotal(d.total ?? 0);
    setLoading(false);
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">工作日志</h1>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">暂无日志</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-2.5 font-medium">时间</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作人</th>
                  <th className="text-left px-4 py-2.5 font-medium">操作</th>
                  <th className="text-left px-4 py-2.5 font-medium">目标</th>
                  <th className="text-left px-4 py-2.5 font-medium">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{log.user_profiles?.display_name || log.user_profiles?.email || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{log.target_type}{log.target_id ? ` #${log.target_id.slice(0, 8)}` : ''}</td>
                    <td className="px-4 py-2.5 text-slate-400 max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 60) : '—'}
                    </td>
                  </tr>
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
