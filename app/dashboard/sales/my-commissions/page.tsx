'use client';

import { useEffect, useState, useCallback } from 'react';

interface Commission {
  id: string;
  product_type: string;
  product_name: string;
  payment_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  user_name: string;
}

interface Summary {
  pending_total: number;
  pending_count: number;
  confirmed_total: number;
  confirmed_count: number;
  paid_total: number;
  paid_count: number;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '待确认', color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: '已确认', color: '#166534', bg: '#DCFCE7' },
  paid_out:  { label: '已发放', color: '#1E40AF', bg: '#DBEAFE' },
  rejected:  { label: '已拒绝', color: '#991B1B', bg: '#FEE2E2' },
  refunded:  { label: '已退款', color: '#6B7280', bg: '#F3F4F6' },
};

const PAGE_SIZE = 20;

export default function MyCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback((s: string, p: number) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (s !== 'all') params.set('status', s);
    params.set('page', String(p));
    params.set('limit', String(PAGE_SIZE));
    fetch(`/api/sales/my-commissions?${params}`).then(r => {
      if (!r.ok) throw new Error(r.status === 403 ? '你还不是活跃的销售人员' : '加载失败');
      return r.json();
    }).then(d => {
      setCommissions(d.data || []);
      setSummary(d.summary || null);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(statusFilter, page); }, [statusFilter, page, fetchData]);

  function changeTab(tab: string) {
    setStatusFilter(tab);
    setPage(1);
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('limit', '10000');
    fetch(`/api/sales/my-commissions?${params}`).then(r => r.json()).then(d => {
      const items: Commission[] = d.data || [];
      const headers = ['日期', '用户', '产品', '支付金额', '佣金比例', '佣金金额', '状态'];
      const rows = items.map(c => [
        new Date(c.created_at).toLocaleDateString('zh-CN'),
        c.user_name,
        c.product_name || c.product_type,
        c.payment_amount.toFixed(2),
        (c.commission_rate * 100).toFixed(0) + '%',
        c.commission_amount.toFixed(2),
        STATUS_CFG[c.status]?.label || c.status,
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[#991B1B] dark:text-[#F87171]">{error}</p>
      <button onClick={() => fetchData(statusFilter, page)} className="text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition">重试</button>
    </div>
  );

  const pendingCount = summary ? (summary as any).pending_count ?? 0 : 0;
  const confirmedCount = summary ? (summary as any).confirmed_count ?? 0 : 0;
  const paidCount = summary ? (summary as any).paid_count ?? 0 : 0;

  const TABS: { key: string; label: string; count?: number }[] = [
    { key: 'all', label: '全部', count: total },
    { key: 'pending', label: '待确认', count: pendingCount },
    { key: 'confirmed', label: '已确认', count: confirmedCount },
    { key: 'paid_out', label: '已发放', count: paidCount },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">佣金明细</h1>
        <button
          onClick={exportCSV}
          className="text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition font-medium"
        >
          导出 CSV
        </button>
      </div>

      {/* Summary cards with left border */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '待确认', value: summary.pending_total, count: pendingCount, borderColor: '#F59E0B', color: '#92400E' },
            { label: '已确认', value: summary.confirmed_total, count: confirmedCount, borderColor: '#22C55E', color: '#166534' },
            { label: '已发放', value: summary.paid_total, count: paidCount, borderColor: '#3B82F6', color: '#1E40AF' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] border-l-4" style={{ borderLeftColor: item.borderColor }}>
              <div className="text-[10px] font-medium mb-1 text-[#6B7280] dark:text-[#94A3B8]">{item.label}</div>
              <div className="text-xl font-bold" style={{ color: item.color }}>
                ${item.value.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] mt-0.5">{item.count} 笔</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab filter with counts */}
      <div className="border-b border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => changeTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                statusFilter === tab.key
                  ? 'border-[#F59E0B] text-[#111827] dark:text-[#F1F5F9]'
                  : 'border-transparent text-[#6B7280] dark:text-[#94A3B8] hover:text-[#374151] dark:hover:text-[#CBD5E1]'
              }`}
            >
              {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
        {loading ? (
          <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">加载中...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] dark:bg-[#0F172A] text-[#6B7280] dark:text-[#94A3B8]">
                  <th className="text-left px-4 py-2.5 font-medium">日期</th>
                  <th className="text-left px-4 py-2.5 font-medium">用户</th>
                  <th className="text-left px-4 py-2.5 font-medium">产品</th>
                  <th className="text-center px-4 py-2.5 font-medium">支付金额</th>
                  <th className="text-center px-4 py-2.5 font-medium">比例</th>
                  <th className="text-center px-4 py-2.5 font-medium">佣金</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#334155]">
                {commissions.map(c => {
                  const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
                  return (
                    <tr key={c.id} className="hover:bg-[#FFFBEB] dark:hover:bg-[#F59E0B]/5 group relative">
                      <td className="px-4 py-3 text-[#6B7280] dark:text-[#94A3B8] border-l-2 border-transparent group-hover:border-[#F59E0B]">
                        {new Date(c.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-[#F3F4F6] dark:bg-[#334155] flex items-center justify-center text-[10px] font-bold text-[#6B7280] dark:text-[#94A3B8]">
                            {(c.user_name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-[#111827] dark:text-[#F1F5F9] font-medium">{c.user_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#374151] dark:text-[#CBD5E1]">{c.product_name || c.product_type}</td>
                      <td className="px-4 py-3 text-center text-[#374151] dark:text-[#CBD5E1]">${c.payment_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-[#6B7280] dark:text-[#94A3B8]">{(c.commission_rate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center text-[#059669] dark:text-[#34D399] font-bold">${c.commission_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {commissions.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6B7280] dark:text-[#94A3B8]">暂无佣金记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
          <span>共 {total} 条，第 {page}/{totalPages} 页</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] dark:bg-[#334155] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg transition ${
                    page === p
                      ? 'bg-[#111827] dark:bg-[#F1F5F9] text-white dark:text-[#0F172A] font-medium'
                      : 'bg-[#F3F4F6] dark:bg-[#334155] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] dark:bg-[#334155] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
