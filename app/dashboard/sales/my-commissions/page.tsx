'use client';

import { useEffect, useState } from 'react';

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
  pending: { label: '待确认', color: '#CA8A04', bg: '#FEF9C3' },
  confirmed: { label: '已确认', color: '#2563EB', bg: '#DBEAFE' },
  paid_out: { label: '已发放', color: '#16A34A', bg: '#DCFCE7' },
  rejected: { label: '已拒绝', color: '#DC2626', bg: '#FEE2E2' },
  refunded: { label: '已退款', color: '#6B7280', bg: '#F3F4F6' },
};

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'paid_out', 'rejected', 'refunded'];

export default function MyCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    fetch(`/api/sales/my-commissions?${params}`).then(r => r.json()).then(d => {
      setCommissions(d.data || []);
      setSummary(d.summary || null);
      setLoading(false);
    });
  }, [statusFilter]);

  function exportCSV() {
    const headers = ['日期', '用户', '产品', '支付金额', '佣金比例', '佣金金额', '状态'];
    const rows = commissions.map(c => [
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
  }

  if (loading) return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;

  return (
    <div className="space-y-6">
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
            { label: '待确认', value: summary.pending_total, color: '#CA8A04', bg: '#FFFBEB' },
            { label: '已确认', value: summary.confirmed_total, color: '#2563EB', bg: '#EFF6FF' },
            { label: '已发放', value: summary.paid_total, color: '#16A34A', bg: '#F0FDF4' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4 border border-[#E5E7EB]" style={{ background: item.bg }}>
              <div className="text-[10px] mb-1" style={{ color: item.color }}>{item.label}</div>
              <div className="text-xl font-bold" style={{ color: item.color }}>${item.value.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(s => {
          const cfg = STATUS_CFG[s];
          const count = s === 'all' ? commissions.length : commissions.filter(c => c.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[10px] px-3 py-1.5 rounded-full transition ${
                statusFilter === s
                  ? 'bg-[#111827] text-white font-medium'
                  : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              {s === 'all' ? '全部' : cfg?.label || s} {count > 0 && count}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
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
                  <tr key={c.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 text-[#6B7280]">{new Date(c.created_at).toLocaleDateString('zh-CN')}</td>
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
      </div>
    </div>
  );
}
