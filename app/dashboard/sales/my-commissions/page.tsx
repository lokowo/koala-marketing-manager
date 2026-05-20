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
  confirmed_total: number;
  paid_total: number;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '待确认', color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: '已确认', color: '#166534', bg: '#DCFCE7' },
  paid_out:  { label: '已发放', color: '#1E40AF', bg: '#DBEAFE' },
  rejected:  { label: '已拒绝', color: '#991B1B', bg: '#FEE2E2' },
  refunded:  { label: '已退款', color: '#6B7280', bg: '#F3F4F6' },
};

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'paid_out', label: '已发放' },
  { key: 'rejected', label: '已拒绝' },
];

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

  if (error) return <p className="text-sm text-[#991B1B] py-8 text-center">{error}</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">佣金明细</h1>
        <button
          onClick={exportCSV}
          className="text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition font-medium"
        >
          导出 CSV
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '待确认', value: summary.pending_total, color: '#92400E', bg: '#FEF3C7' },
            { label: '已确认', value: summary.confirmed_total, color: '#166534', bg: '#DCFCE7' },
            { label: '已发放', value: summary.paid_total, color: '#1E40AF', bg: '#DBEAFE' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4 border border-[#E5E7EB]" style={{ background: item.bg }}>
              <div className="text-[10px] font-medium mb-1" style={{ color: item.color }}>{item.label}</div>
              <div className="text-xl font-bold" style={{ color: item.color }}>
                ${item.value.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab filter */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => changeTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition ${
                statusFilter === tab.key
                  ? 'border-[#F59E0B] text-[#111827]'
                  : 'border-transparent text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        {loading ? (
          <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#6B7280]">
                  <th className="text-left px-4 py-2.5 font-medium">日期</th>
                  <th className="text-left px-4 py-2.5 font-medium">用户</th>
                  <th className="text-left px-4 py-2.5 font-medium">产品</th>
                  <th className="text-center px-4 py-2.5 font-medium">支付金额</th>
                  <th className="text-center px-4 py-2.5 font-medium">比例</th>
                  <th className="text-center px-4 py-2.5 font-medium">佣金</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {commissions.map(c => {
                  const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
                  return (
                    <tr key={c.id} className="hover:bg-[#FFFBEB] group relative">
                      <td className="px-4 py-3 text-[#6B7280] border-l-2 border-transparent group-hover:border-[#F59E0B]">
                        {new Date(c.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-[#111827] font-medium">{c.user_name}</td>
                      <td className="px-4 py-3 text-[#374151]">{c.product_name || c.product_type}</td>
                      <td className="px-4 py-3 text-center text-[#374151]">${c.payment_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-[#6B7280]">{(c.commission_rate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center text-[#D4A843] font-bold">${c.commission_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {commissions.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">暂无佣金记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#6B7280]">
          <span>共 {total} 条，第 {page}/{totalPages} 页</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition disabled:opacity-40 disabled:cursor-not-allowed"
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
                      ? 'bg-[#111827] text-white font-medium'
                      : 'bg-[#F3F4F6] hover:bg-[#E5E7EB]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
