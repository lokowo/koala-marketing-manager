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

const CAT_CFG: Record<string, { label: string; color: string }> = {
  user_management:       { label: '用户管理', color: '#3B82F6' },
  role_management:       { label: '角色管理', color: '#8B5CF6' },
  professor_management:  { label: '教授管理', color: '#06B6D4' },
  blog_management:       { label: '博客管理', color: '#EC4899' },
  admin_general:         { label: '管理操作', color: '#6B7280' },
  customer_update:       { label: '客户跟进', color: '#F59E0B' },
  customer_stage_change: { label: '阶段变更', color: '#10B981' },
  create_qrcode:         { label: '生成推广码', color: '#EF4444' },
  customer_contact:      { label: '客户联系', color: '#3B82F6' },
  survey_management:     { label: '问卷管理', color: '#8B5CF6' },
};

export default function SalesMyLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/work-logs?mine=true&limit=50')
      .then(r => r.json())
      .then(d => setLogs(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped: { date: string; items: LogEntry[] }[] = [];
  for (const log of logs) {
    const dateStr = new Date(log.created_at).toLocaleDateString('zh-CN');
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateStr) last.items.push(log);
    else grouped.push({ date: dateStr, items: [log] });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">操作记录</h1>
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">最近 50 条操作记录</p>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">加载中...</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">暂无操作记录</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.date}>
              <div className="text-[10px] font-medium text-[#9CA3AF] dark:text-[#64748B] mb-2 pl-1">{group.date}</div>
              <div className="space-y-2">
                {group.items.map(log => {
                  const cat = CAT_CFG[log.action_category] || { label: log.action_category, color: '#9CA3AF' };
                  const isExpanded = expanded === log.id;
                  return (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:border-[#D1D5DB] dark:hover:border-[#475569] transition cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-start gap-3 px-4 py-3">
                        <div
                          className="mt-1.5 size-2.5 rounded-full flex-shrink-0"
                          style={{ background: cat.color, boxShadow: `0 0 0 3px ${cat.color}20` }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: cat.color + '15', color: cat.color }}
                            >
                              {cat.label}
                            </span>
                            <span className="text-xs font-medium text-[#111827] dark:text-[#F1F5F9]">{log.action}</span>
                          </div>
                          {(log.target_name || log.target_type) && (
                            <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] mt-0.5">
                              {log.target_name || log.target_type}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] flex-shrink-0">
                          {new Date(log.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isExpanded && log.details && (
                        <div className="px-4 pb-3 border-t border-[#F3F4F6] dark:border-[#334155]">
                          <pre className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] bg-[#F9FAFB] dark:bg-[#0F172A] rounded-lg p-3 mt-2 overflow-x-auto">
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
    </div>
  );
}
