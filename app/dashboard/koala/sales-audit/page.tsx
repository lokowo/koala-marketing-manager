'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  referral_attribution_created: '归因创建',
  commission_created: '佣金创建',
  commission_confirmed: '佣金确认',
  commission_batch_payout: '批量发放',
  commission_rejected: '佣金拒绝',
  commission_refunded: '佣金退款',
  agent_created: '新建销售',
  agent_updated: '更新销售',
  rate_updated: '比例更新',
};

const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  system: { label: '系统', color: '#6B7280', bg: '#F3F4F6' },
  super_admin: { label: '超管', color: '#DC2626', bg: '#FEE2E2' },
  admin: { label: '管理', color: '#2563EB', bg: '#DBEAFE' },
  sales: { label: '销售', color: '#CA8A04', bg: '#FEF9C3' },
};

export default function SalesAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (actionFilter) params.set('action', actionFilter);
    if (roleFilter) params.set('role', roleFilter);
    fetch(`/api/admin/sales-audit?${params}`).then(r => r.json()).then(d => {
      setLogs(d.data || []);
      setTotal(d.total || 0);
      setLoading(false);
    });
  }, [page, actionFilter, roleFilter]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">审计日志</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2 text-xs bg-white border border-slate-200 text-slate-700 focus:outline-none"
        >
          <option value="">全部操作</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2 text-xs bg-white border border-slate-200 text-slate-700 focus:outline-none"
        >
          <option value="">全部角色</option>
          {Object.entries(ROLE_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <span className="text-[10px] text-slate-400 self-center">共 {total} 条</span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中...</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const roleCfg = ROLE_CFG[log.actor_role] || ROLE_CFG.system;
            const isExpanded = expanded === log.id;
            return (
              <div
                key={log.id}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : log.id)}
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-1 size-2 rounded-full flex-shrink-0 bg-amber-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: roleCfg.bg, color: roleCfg.color }}>
                        {roleCfg.label}
                      </span>
                      <span className="text-xs font-medium text-slate-800">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {log.target_type && (
                        <span className="text-[10px] text-slate-400">{log.target_type}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {log.actor_email || log.actor_id.slice(0, 8)}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {isExpanded && log.details && (
                  <div className="px-4 pb-3 border-t border-slate-100">
                    <pre className="text-[10px] text-slate-500 bg-slate-50 rounded p-3 mt-2 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
          {logs.length === 0 && (
            <p className="text-sm text-slate-400 py-8 text-center">暂无审计日志</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs px-3 py-1.5 rounded bg-slate-100 text-slate-600 disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs px-3 py-1.5 rounded bg-slate-100 text-slate-600 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
