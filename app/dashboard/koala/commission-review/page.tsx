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
  pending: { label: '待确认', color: '#CA8A04', bg: '#FEF9C3' },
  confirmed: { label: '已确认', color: '#2563EB', bg: '#DBEAFE' },
  paid_out: { label: '已发放', color: '#16A34A', bg: '#DCFCE7' },
  rejected: { label: '已拒绝', color: '#DC2626', bg: '#FEE2E2' },
  refunded: { label: '已退款', color: '#6B7280', bg: '#F3F4F6' },
};

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
    if (selected.size === commissions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(commissions.map(c => c.id)));
    }
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
    if (res.ok) {
      loadData(statusFilter);
    } else {
      alert('发放失败');
    }
    setPaying(false);
  }

  const selectedTotal = commissions
    .filter(c => selected.has(c.id))
    .reduce((s, c) => s + c.commission_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">佣金审核发放</h1>
        {statusFilter === 'confirmed' && selected.size > 0 && (
          <button
            onClick={batchPayout}
            disabled={paying}
            className="text-xs px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            {paying ? '发放中...' : `发放 ${selected.size} 笔 ($${selectedTotal.toFixed(2)})`}
          </button>
        )}
      </div>

      {/* Pending total */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="text-xs text-amber-700 mb-1">待发放总额</div>
        <div className="text-2xl font-bold text-amber-700">${pendingTotal.toFixed(2)}</div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5">
        {['confirmed', 'paid_out', 'pending', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[10px] px-3 py-1.5 rounded-lg transition ${
              statusFilter === s ? 'bg-slate-800 text-white font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? '全部' : STATUS_CFG[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">加载中...</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  {statusFilter === 'confirmed' && (
                    <th className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={selected.size === commissions.length && commissions.length > 0} onChange={toggleAll} className="accent-amber-500" />
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
              <tbody className="divide-y divide-slate-100">
                {commissions.map(c => {
                  const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50 ${selected.has(c.id) ? 'bg-amber-50/50' : ''}`}>
                      {statusFilter === 'confirmed' && (
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="accent-amber-500" />
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-slate-500">{new Date(c.created_at).toLocaleDateString('zh-CN')}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{c.agent_name}</td>
                      <td className="px-3 py-2.5 text-slate-600">{c.user_name}</td>
                      <td className="px-3 py-2.5 text-slate-600">{c.product_name || c.product_type}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600">${c.payment_amount.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{(c.commission_rate * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2.5 text-center font-bold text-amber-600">${c.commission_amount.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {commissions.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">暂无记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
