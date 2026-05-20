'use client';

import { useEffect, useState } from 'react';

interface Commission {
  id: string;
  agent_name: string;
  user_name: string;
  product_type: string;
  product_name: string;
  payment_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '待确认', color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: '已确认', color: '#166534', bg: '#DCFCE7' },
  paid_out:  { label: '已发放', color: '#1E40AF', bg: '#DBEAFE' },
  rejected:  { label: '已拒绝', color: '#991B1B', bg: '#FEE2E2' },
  refunded:  { label: '已退款', color: '#6B7280', bg: '#F3F4F6' },
};

const TABS = [
  { key: 'confirmed', label: '待发放' },
  { key: 'pending', label: '待确认' },
  { key: 'paid_out', label: '已发放' },
  { key: 'all', label: '全部' },
];

export default function CommissionReviewPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('confirmed');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);

  function loadData(status: string) {
    setLoading(true);
    fetch(`/api/admin/commission-payout?status=${status}`).then(r => r.json()).then(d => {
      setCommissions(d.data || []);
      setPendingTotal(d.pendingTotal || 0);
      setSelected(new Set());
      setLoading(false);
    });
  }

  useEffect(() => { loadData(statusFilter); }, [statusFilter]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === commissions.length) setSelected(new Set());
    else setSelected(new Set(commissions.map(c => c.id)));
  }

  async function batchPayout() {
    if (selected.size === 0) return;
    if (!confirm(`确认发放 ${selected.size} 笔佣金？`)) return;
    setPaying(true);
    const res = await fetch('/api/admin/commission-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_ids: Array.from(selected) }),
    });
    if (res.ok) loadData(statusFilter);
    else alert('发放失败');
    setPaying(false);
  }

  const selectedTotal = commissions
    .filter(c => selected.has(c.id))
    .reduce((s, c) => s + c.commission_amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">佣金审核发放</h1>
        {statusFilter === 'confirmed' && selected.size > 0 && (
          <button
            onClick={batchPayout}
            disabled={paying}
            className="text-xs px-4 py-2 rounded-lg bg-[#166534] text-white font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {paying ? '发放中...' : `批量发放 ${selected.size} 笔 ($${selectedTotal.toFixed(2)})`}
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 border border-[#E5E7EB] bg-[#FEF3C7]">
          <div className="text-[10px] text-[#92400E] font-medium mb-0.5">待发放总额</div>
          <div className="text-2xl font-bold text-[#92400E]">${pendingTotal.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-4 border border-[#E5E7EB] bg-[#DCFCE7]">
          <div className="text-[10px] text-[#166534] font-medium mb-0.5">已选金额</div>
          <div className="text-2xl font-bold text-[#166534]">
            {selected.size > 0 ? `$${selectedTotal.toFixed(2)}` : '$0.00'}
          </div>
        </div>
      </div>

      {/* Tab filter */}
      <div className="border-b border-[#E5E7EB]">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
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

      {loading ? (
        <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F9FAFB] text-[#6B7280]">
                  {statusFilter === 'confirmed' && (
                    <th className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={selected.size === commissions.length && commissions.length > 0} onChange={toggleAll} className="accent-[#F59E0B]" />
                    </th>
                  )}
                  <th className="text-left px-3 py-2.5 font-medium">日期</th>
                  <th className="text-left px-3 py-2.5 font-medium">销售</th>
                  <th className="text-left px-3 py-2.5 font-medium">用户</th>
                  <th className="text-left px-3 py-2.5 font-medium">产品</th>
                  <th className="text-center px-3 py-2.5 font-medium">支付</th>
                  <th className="text-center px-3 py-2.5 font-medium">比例</th>
                  <th className="text-center px-3 py-2.5 font-medium">佣金</th>
                  <th className="text-center px-3 py-2.5 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {commissions.map(c => {
                  const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
                  return (
                    <tr key={c.id} className={`hover:bg-[#F9FAFB] ${selected.has(c.id) ? 'bg-[#FFFBEB]' : ''}`}>
                      {statusFilter === 'confirmed' && (
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="accent-[#F59E0B]" />
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-[#6B7280]">{new Date(c.created_at).toLocaleDateString('zh-CN')}</td>
                      <td className="px-3 py-2.5 font-medium text-[#111827]">{c.agent_name}</td>
                      <td className="px-3 py-2.5 text-[#374151]">{c.user_name}</td>
                      <td className="px-3 py-2.5 text-[#374151]">{c.product_name || c.product_type}</td>
                      <td className="px-3 py-2.5 text-center text-[#374151]">${c.payment_amount.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-center text-[#6B7280]">{(c.commission_rate * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2.5 text-center font-bold text-[#D4A843]">${c.commission_amount.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {commissions.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-[#6B7280]">暂无记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
