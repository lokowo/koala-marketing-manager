'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  id: string;
  action: string;
  action_category: string;
  target_type: string | null;
  target_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const CAT_LABELS: Record<string, string> = {
  user_management: '用户管理',
  role_management: '角色管理',
  professor_management: '教授管理',
  blog_management: '博客管理',
  admin_general: '管理操作',
  customer_update: '客户跟进',
  customer_stage_change: '阶段变更',
  create_qrcode: '生成推广码',
};

export default function SalesMyLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/work-logs?mine=true&limit=50')
      .then(r => r.json())
      .then(d => setLogs(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">我的操作记录</h1>
        <p className="text-sm text-slate-500 mt-0.5">显示你的最近 50 条操作</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">加载中...</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-400">暂无操作记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">时间</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs">操作</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs hidden sm:table-cell">分类</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium text-xs hidden md:table-cell">目标</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">
                    {CAT_LABELS[log.action_category] || log.action_category}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                    {log.target_name || log.target_type || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
