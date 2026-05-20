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

const ACTION_CFG: Record<string, { label: string; color: string }> = {
  referral_attribution_created: { label: '归因创建', color: '#10B981' },
  commission_created:           { label: '佣金创建', color: '#3B82F6' },
  commission_confirmed:         { label: '佣金确认', color: '#166534' },
  commission_batch_payout:      { label: '批量发放', color: '#8B5CF6' },
  commission_rejected:          { label: '佣金拒绝', color: '#EF4444' },
  commission_refunded:          { label: '佣金退款', color: '#F59E0B' },
  agent_created:                { label: '新建销售', color: '#06B6D4' },
  agent_updated:                { label: '更新销售', color: '#F59E0B' },
  rate_updated:                 { label: '比例更新', color: '#EC4899' },
};

const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  system:      { label: '系统', color: '#6B7280', bg: '#F3F4F6' },
  super_admin: { label: '超管', color: '#991B1B', bg: '#FEE2E2' },
  admin:       { label: '管理', color: '#1E40AF', bg: '#DBEAFE' },
  sales:       { label: '销售', color: '#92400E', bg: '#FEF3C7' },
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

  const grouped: { date: string; items: AuditLog[] }[] = [];
  for (const log of logs) {
    const dateStr = new Date(log.created_at).toLocaleDateString('zh-CN');
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateStr) last.items.push(log);
    else grouped.push({ date: dateStr, items: [log] });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#111827]">审计日志</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2 text-xs bg-white border border-[#E5E7EB] text-[#374151] focus:outline-none"
        >
          <option value="">全部操作</option>
          {Object.entries(ACTION_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg px-3 py-2 text-xs bg-white border border-[#E5E7EB] text-[#374151] focus:outline-none"
        >
          <option value="">全部角色</option>
          {Object.entries(ROLE_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <span className="text-[10px] text-[#9CA3AF] self-center">共 {total} 条</span>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-[#6B7280] py-8 text-center">暂无审计日志</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.date}>
              <div className="text-[10px] font-medium text-[#9CA3AF] mb-2 pl-1">{group.date}</div>
              <div className="space-y-2">
                {group.items.map(log => {
                  const actionCfg = ACTION_CFG[log.action] || { label: log.action, color: '#9CA3AF' };
                  const roleCfg = ROLE_CFG[log.actor_role] || ROLE_CFG.system;
                  const isExpanded = expanded === log.id;
                  return (
                    <div
                      key={log.id}
                      className="bg-white rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-start gap-3 px-4 py-3">
                        <div
                          className="mt-1.5 size-2.5 rounded-full flex-shrink-0"
                          style={{ background: actionCfg.color, boxShadow: `0 0 0 3px ${actionCfg.color}20` }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: roleCfg.bg, color: roleCfg.color }}
                            >
                              {roleCfg.label}
                            </span>
                            <span className="text-xs font-medium text-[#111827]">
                              {actionCfg.label}
                            </span>
                            {log.target_type && (
                              <span className="text-[10px] text-[#9CA3AF]">{log.target_type}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                            {log.actor_email || log.actor_id.slice(0, 8)}
                          </div>
                        </div>
                        <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">
                          {new Date(log.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      {isExpanded && log.details && (
                        <div className="px-4 pb-3 border-t border-[#F3F4F6]">
                          <pre className="text-[10px] text-[#6B7280] bg-[#F9FAFB] rounded-lg p-3 mt-2 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#6B7280]">
          <span>第 {page}/{totalPages} 页</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition disabled:opacity-40"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
