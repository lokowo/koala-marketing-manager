'use client';

import { useEffect, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconCheck } from '@tabler/icons-react';

interface Commission {
  id: string;
  agent_name: string;
  agent_email: string;
  user_name: string;
  user_email: string;
  product_type: string;
  product_name: string;
  payment_amount: number;
  commission_rate: number;
  commission_amount: number;
  refunded_amount: number | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  confirmation_method: string | null;
  paid_out_at: string | null;
  payout_reference: string | null;
  payout_method: string | null;
  payout_note: string | null;
  stripe_payment_id: string | null;
  stripe_invoice_id: string | null;
  rejection_reason: string | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: '待确认', color: '#92400E', bg: '#FEF3C7' },
  confirmed: { label: '已确认', color: '#166534', bg: '#DCFCE7' },
  paid_out:  { label: '已发放', color: '#1E40AF', bg: '#DBEAFE' },
  rejected:  { label: '已拒绝', color: '#991B1B', bg: '#FEE2E2' },
  refunded:  { label: '已退款', color: '#6B7280', bg: '#F3F4F6' },
};

const TABS = [
  { key: 'confirmed', label: '已确认(待发放)' },
  { key: 'paid_out', label: '已发放' },
  { key: 'pending', label: '待确认' },
  { key: 'all', label: '全部' },
];

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtMethod(m: string | null): string {
  if (!m) return '—';
  if (m === 'auto_t30') return '自动 (30天)';
  if (m === 'manual_admin') return '管理员手动';
  return m;
}

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

export default function CommissionReviewPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('confirmed');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function loadData(status: string) {
    setLoading(true);
    fetch(`/api/admin/commission-payout?status=${status}`).then(r => r.json()).then(d => {
      setCommissions(d.data || []);
      setPendingTotal(d.pendingTotal || 0);
      setSelected(new Set());
      setExpandedId(null);
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

  async function manualConfirm(id: string) {
    if (!confirm('确认将此笔佣金标记为已确认？')) return;
    setConfirmingId(id);
    const res = await fetch('/api/admin/commission-payout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_id: id }),
    });
    if (res.ok) loadData(statusFilter);
    else alert('确认失败');
    setConfirmingId(null);
  }

  const selectedTotal = commissions
    .filter(c => selected.has(c.id))
    .reduce((s, c) => s + c.commission_amount, 0);

  const showCheckbox = statusFilter === 'confirmed';
  const colCount = showCheckbox ? 10 : 9;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-light tracking-tight text-gray-900">佣金审核发放</h1>

      <div className="rounded-xl p-4 border border-amber-200 bg-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-700 font-medium mb-0.5">待发放总额</div>
            <div className="text-2xl font-bold text-amber-800">${pendingTotal.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-amber-600">{commissions.filter(c => c.status === 'confirmed').length} 笔待发放</div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all duration-150 ${
                statusFilter === tab.key
                  ? 'border-amber-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">加载中...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  {showCheckbox && (
                    <th className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={selected.size === commissions.length && commissions.length > 0} onChange={toggleAll} className="accent-[#F59E0B]" />
                    </th>
                  )}
                  <th className="w-8 px-1" />
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
              <tbody className="divide-y divide-gray-100">
                {commissions.map(c => {
                  const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
                  const isExpanded = expandedId === c.id;
                  const isPending = c.status === 'pending';
                  const days = daysSince(c.created_at);

                  return (
                    <CommissionRow
                      key={c.id}
                      c={c}
                      cfg={cfg}
                      isExpanded={isExpanded}
                      isPending={isPending}
                      days={days}
                      showCheckbox={showCheckbox}
                      isSelected={selected.has(c.id)}
                      confirmingId={confirmingId}
                      colCount={colCount}
                      onToggleSelect={() => toggleSelect(c.id)}
                      onToggleExpand={() => setExpandedId(isExpanded ? null : c.id)}
                      onConfirm={() => manualConfirm(c.id)}
                    />
                  );
                })}
                {commissions.length === 0 && (
                  <tr><td colSpan={colCount} className="px-3 py-8 text-center text-gray-500">暂无记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {statusFilter === 'confirmed' && selected.size > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-lg rounded-b-xl -mx-4 -mb-4">
          <span className="text-sm text-gray-600">
            已选 <strong>{selected.size}</strong> 笔 共 <strong className="text-amber-600">${selectedTotal.toFixed(2)}</strong>
          </span>
          <button
            onClick={batchPayout}
            disabled={paying}
            className="text-xs px-4 py-2 rounded-md bg-[#166534] text-white font-medium hover:opacity-90 transition-all duration-150 disabled:opacity-50"
          >
            {paying ? '发放中...' : '批量标记已发放'}
          </button>
        </div>
      )}
    </div>
  );
}

function CommissionRow({
  c, cfg, isExpanded, isPending, days, showCheckbox, isSelected, confirmingId, colCount,
  onToggleSelect, onToggleExpand, onConfirm,
}: {
  c: Commission;
  cfg: { label: string; color: string; bg: string };
  isExpanded: boolean;
  isPending: boolean;
  days: number;
  showCheckbox: boolean;
  isSelected: boolean;
  confirmingId: string | null;
  colCount: number;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <tr
        className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-amber-50' : ''}`}
        onClick={onToggleExpand}
      >
        {showCheckbox && (
          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="accent-[#F59E0B]" />
          </td>
        )}
        <td className="px-1 py-2.5 text-gray-400">
          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </td>
        <td className="px-3 py-2.5 text-gray-500">{new Date(c.created_at).toLocaleDateString('zh-CN')}</td>
        <td className="px-3 py-2.5 font-medium text-gray-900">{c.agent_name}</td>
        <td className="px-3 py-2.5 text-gray-700">{c.user_name}</td>
        <td className="px-3 py-2.5 text-gray-700">{c.product_name || c.product_type}</td>
        <td className="px-3 py-2.5 text-center text-gray-700">${c.payment_amount.toFixed(2)}</td>
        <td className="px-3 py-2.5 text-center text-gray-500">{(c.commission_rate * 100).toFixed(0)}%</td>
        <td className="px-3 py-2.5 text-center font-bold text-[#D4A843]">${c.commission_amount.toFixed(2)}</td>
        <td className="px-3 py-2.5 text-center">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={colCount} className="bg-gray-50 px-0 py-0">
            <div className="px-6 py-4 space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-xs">
                <div>
                  <div className="text-gray-400 mb-0.5">销售 (Agent)</div>
                  <div className="text-gray-900 font-medium">{c.agent_name}</div>
                  <div className="text-gray-500">{c.agent_email || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">关联用户</div>
                  <div className="text-gray-900 font-medium">{c.user_name}</div>
                  <div className="text-gray-500">{c.user_email || '—'}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">产品</div>
                  <div className="text-gray-900 font-medium">{c.product_name || c.product_type}</div>
                  <div className="text-gray-500">{c.product_type}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">支付详情</div>
                  <div className="text-gray-900 font-medium">${c.payment_amount.toFixed(2)} AUD</div>
                  <div className="text-gray-500 font-mono text-[10px] truncate" title={c.stripe_payment_id || ''}>
                    {c.stripe_payment_id ? `Stripe: ${c.stripe_payment_id.slice(0, 20)}...` : '—'}
                  </div>
                </div>
              </div>

              {/* Payout info */}
              {(c.payout_reference || c.payout_method || c.payout_note) && (
                <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-xs border-t border-gray-200 pt-3">
                  <div>
                    <div className="text-gray-400 mb-0.5">发放方式</div>
                    <div className="text-gray-900">{c.payout_method || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-0.5">发放凭证</div>
                    <div className="text-gray-900 font-mono text-[10px]">{c.payout_reference || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-0.5">发放备注</div>
                    <div className="text-gray-900">{c.payout_note || '—'}</div>
                  </div>
                </div>
              )}

              {/* Refund info */}
              {c.refunded_amount && c.refunded_amount > 0 && (
                <div className="text-xs border-t border-gray-200 pt-3">
                  <span className="text-red-600 font-medium">退款金额: ${c.refunded_amount.toFixed(2)}</span>
                  {c.rejection_reason && <span className="text-gray-500 ml-3">原因: {c.rejection_reason}</span>}
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-gray-200 pt-3">
                <div className="text-[11px] text-gray-400 font-medium mb-2">时间线</div>
                <div className="flex items-center gap-2 text-xs">
                  <TimelineStep label="创建" date={c.created_at} active />
                  <TimelineArrow />
                  <TimelineStep
                    label="确认"
                    date={c.confirmed_at}
                    sub={fmtMethod(c.confirmation_method)}
                    active={!!c.confirmed_at}
                  />
                  <TimelineArrow />
                  <TimelineStep label="发放" date={c.paid_out_at} active={!!c.paid_out_at} />
                </div>
              </div>

              {/* Manual confirm button */}
              {isPending && (
                <div className="border-t border-gray-200 pt-3 flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                    disabled={confirmingId === c.id}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all duration-150 disabled:opacity-50"
                  >
                    <IconCheck size={13} />
                    {confirmingId === c.id ? '确认中...' : '手动确认'}
                  </button>
                  <span className="text-[11px] text-gray-400">
                    已等待 {days} 天{days >= 30 ? '（已满30天，将自动确认）' : `（${30 - days} 天后自动确认）`}
                  </span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function TimelineStep({ label, date, sub, active }: { label: string; date: string | null; sub?: string; active: boolean }) {
  return (
    <div className={`flex flex-col items-center min-w-[72px] ${active ? '' : 'opacity-40'}`}>
      <div className={`w-2 h-2 rounded-full mb-1 ${active ? 'bg-blue-600' : 'bg-gray-300'}`} />
      <div className="text-[11px] font-medium text-gray-700">{label}</div>
      <div className="text-[10px] text-gray-500">{fmtDate(date)}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}

function TimelineArrow() {
  return <div className="flex-1 h-px bg-gray-200 min-w-[16px] mt-[-12px]" />;
}
