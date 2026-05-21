'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconCheck,
  IconCopy,
  IconX,
  IconUser,
  IconCreditCard,
} from '@tabler/icons-react';

interface Commission {
  id: string;
  agent_name: string;
  agent_email: string;
  agent_payment_method: string | null;
  agent_payment_account: string | null;
  agent_payment_name: string | null;
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

const STATUS_CFG: Record<string, { label: string; tw: string }> = {
  pending:   { label: '待确认', tw: 'bg-amber-100 text-amber-800' },
  confirmed: { label: '已确认', tw: 'bg-green-100 text-green-800' },
  paid_out:  { label: '已发放', tw: 'bg-blue-100 text-blue-800' },
  rejected:  { label: '已拒绝', tw: 'bg-red-100 text-red-800' },
  refunded:  { label: '已退款', tw: 'bg-gray-100 text-gray-600' },
};

const TABS = [
  { key: 'confirmed', label: '已确认 (待发放)' },
  { key: 'paid_out', label: '已发放' },
  { key: 'pending', label: '待确认' },
  { key: 'all', label: '全部' },
];

function fmtDateShort(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function fmtDateFull(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  const h = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function fmtMethod(m: string | null): string {
  if (!m) return '—';
  if (m === 'auto_t30') return '自动确认 (T+30)';
  if (m === 'manual_admin') return '管理员手动确认';
  return m;
}

function daysSince(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white border border-gray-200 rounded-lg pl-0 pr-4 py-3 shadow-lg animate-in slide-in-from-top-2">
      <div className="w-1 h-full rounded-l-lg bg-green-500 self-stretch" />
      <span className="text-sm text-gray-700 ml-3">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
        <IconX size={14} />
      </button>
    </div>
  );
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [toast, setToast] = useState('');

  const copy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setToast(`已复制${label ? ' ' + label : ''}`);
    } catch { /* clipboard blocked */ }
  }, [value, label]);

  return (
    <>
      <button
        onClick={copy}
        title={`复制${label || ''}`}
        className="inline-flex items-center text-gray-300 hover:text-blue-600 transition-colors duration-150 ml-1"
      >
        <IconCopy size={12} stroke={1.5} />
      </button>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
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
  const [agentModalData, setAgentModalData] = useState<Commission | null>(null);

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

      {/* Summary card */}
      <div className="rounded-lg p-5 border border-amber-200 bg-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-700 font-medium mb-1">待发放总额</div>
            <div className="text-2xl font-light tracking-tight text-amber-900">
              ${pendingTotal.toFixed(2)}
              <span className="text-sm font-normal text-amber-600 ml-2">AUD</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-amber-600">
              {commissions.filter(c => c.status === 'confirmed').length} 笔待发放
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all duration-150 ${
                statusFilter === tab.key
                  ? 'border-blue-600 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">加载中...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  {showCheckbox && (
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === commissions.length && commissions.length > 0}
                        onChange={toggleAll}
                        className="accent-blue-600 w-3.5 h-3.5"
                      />
                    </th>
                  )}
                  <th className="w-8 px-1" />
                  <th className="text-left px-3 py-3 font-medium">日期</th>
                  <th className="text-left px-3 py-3 font-medium">销售</th>
                  <th className="text-left px-3 py-3 font-medium">用户</th>
                  <th className="text-left px-3 py-3 font-medium">产品</th>
                  <th className="text-right px-3 py-3 font-medium">支付</th>
                  <th className="text-center px-3 py-3 font-medium">比例</th>
                  <th className="text-right px-4 py-3 font-medium">佣金</th>
                  <th className="text-center px-3 py-3 font-medium">状态</th>
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
                      onAgentClick={() => setAgentModalData(c)}
                    />
                  );
                })}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-3 py-12 text-center text-gray-400 text-sm">
                      暂无佣金记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch payout bar */}
      {statusFilter === 'confirmed' && selected.size > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-3 flex items-center justify-between shadow-lg rounded-b-lg -mx-4 -mb-4">
          <span className="text-sm text-gray-600">
            已选 <strong className="text-gray-900">{selected.size}</strong> 笔，共{' '}
            <strong className="text-amber-600">${selectedTotal.toFixed(2)}</strong>
          </span>
          <button
            onClick={batchPayout}
            disabled={paying}
            className="text-[13px] px-5 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all duration-150 disabled:opacity-50"
          >
            {paying ? '发放中...' : '批量标记已发放'}
          </button>
        </div>
      )}

      {/* Agent payment modal */}
      {agentModalData && (
        <AgentPaymentModal c={agentModalData} onClose={() => setAgentModalData(null)} />
      )}
    </div>
  );
}

/* ── Agent Payment Modal ─────────────────────────────────────── */

function AgentPaymentModal({ c, onClose }: { c: Commission; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-lg w-full max-w-sm mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <IconUser size={16} className="text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{c.agent_name}</div>
              <div className="text-xs text-gray-500">{c.agent_email || '—'}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors duration-150">
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <IconCreditCard size={14} />
            <span className="font-medium">付款资料</span>
          </div>

          <InfoRow label="付款方式" value={c.agent_payment_method} />
          <InfoRow label="收款账户" value={c.agent_payment_account} copyable />
          <InfoRow label="账户姓名" value={c.agent_payment_name} copyable />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, copyable }: { label: string; value: string | null; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium flex items-center">
        {value || '—'}
        {copyable && value && <CopyBtn value={value} label={label} />}
      </span>
    </div>
  );
}

/* ── Commission Row ──────────────────────────────────────────── */

function CommissionRow({
  c, cfg, isExpanded, isPending, days, showCheckbox, isSelected, confirmingId, colCount,
  onToggleSelect, onToggleExpand, onConfirm, onAgentClick,
}: {
  c: Commission;
  cfg: { label: string; tw: string };
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
  onAgentClick: () => void;
}) {
  return (
    <>
      <tr
        className={`hover:bg-gray-50 cursor-pointer transition-colors duration-100 ${isSelected ? 'bg-blue-50' : ''}`}
        onClick={onToggleExpand}
      >
        {showCheckbox && (
          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="accent-blue-600 w-3.5 h-3.5" />
          </td>
        )}
        <td className="px-1 py-3 text-gray-400">
          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </td>
        <td className="px-3 py-3 text-xs text-gray-500 tabular-nums">{fmtDateShort(c.created_at)}</td>
        <td className="px-3 py-3">
          <button
            onClick={(e) => { e.stopPropagation(); onAgentClick(); }}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 text-left"
          >
            {c.agent_name}
          </button>
        </td>
        <td className="px-3 py-3 text-sm text-gray-600">{c.user_name}</td>
        <td className="px-3 py-3 text-sm text-gray-600">{c.product_name || c.product_type}</td>
        <td className="px-3 py-3 text-right text-sm text-gray-600 tabular-nums">${c.payment_amount.toFixed(2)}</td>
        <td className="px-3 py-3 text-center text-xs text-gray-400 tabular-nums">{(c.commission_rate * 100).toFixed(0)}%</td>
        <td className="px-4 py-3 text-right">
          <span className="text-lg font-semibold text-gray-900 tabular-nums">${c.commission_amount.toFixed(2)}</span>
        </td>
        <td className="px-3 py-3 text-center">
          <span className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium ${cfg.tw}`}>
            {cfg.label}
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={colCount} className="px-0 py-0 border-t border-gray-100">
            <div className="bg-slate-50 px-6 py-5 space-y-5">
              {/* Section: 基本信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <DetailCard label="销售 (Agent)">
                  <div className="text-sm font-medium text-gray-900 flex items-center">
                    {c.agent_name}
                    <CopyBtn value={c.agent_name} label="销售名" />
                  </div>
                  <div className="text-xs text-gray-500 flex items-center mt-0.5">
                    {c.agent_email || '—'}
                    {c.agent_email && <CopyBtn value={c.agent_email} label="邮箱" />}
                  </div>
                </DetailCard>

                <DetailCard label="关联用户">
                  <div className="text-sm font-medium text-gray-900">{c.user_name}</div>
                  <div className="text-xs text-gray-500 flex items-center mt-0.5">
                    {c.user_email || '—'}
                    {c.user_email && <CopyBtn value={c.user_email} label="邮箱" />}
                  </div>
                </DetailCard>

                <DetailCard label="产品">
                  <div className="text-sm font-medium text-gray-900">{c.product_name || c.product_type}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.product_type}</div>
                </DetailCard>

                <DetailCard label="支付详情">
                  <div className="text-sm font-medium text-gray-900 flex items-center">
                    ${c.payment_amount.toFixed(2)} AUD
                    <CopyBtn value={c.payment_amount.toFixed(2)} label="金额" />
                  </div>
                  {c.stripe_payment_id && (
                    <div className="text-[11px] text-gray-400 font-mono flex items-center mt-0.5 max-w-full">
                      <span className="truncate">{c.stripe_payment_id}</span>
                      <CopyBtn value={c.stripe_payment_id} label="Stripe ID" />
                    </div>
                  )}
                </DetailCard>
              </div>

              {/* Section: 发放信息 */}
              {(c.payout_reference || c.payout_method || c.payout_note) && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="text-xs text-gray-400 font-medium mb-3">发放信息</div>
                  <div className="grid grid-cols-3 gap-6">
                    <DetailCard label="发放方式">
                      <div className="text-sm text-gray-900">{c.payout_method || '—'}</div>
                    </DetailCard>
                    <DetailCard label="发放凭证">
                      <div className="text-sm text-gray-900 font-mono flex items-center">
                        {c.payout_reference || '—'}
                        {c.payout_reference && <CopyBtn value={c.payout_reference} label="凭证号" />}
                      </div>
                    </DetailCard>
                    <DetailCard label="备注">
                      <div className="text-sm text-gray-900">{c.payout_note || '—'}</div>
                    </DetailCard>
                  </div>
                </div>
              )}

              {/* Section: 退款 */}
              {c.refunded_amount != null && c.refunded_amount > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-red-600 font-medium">退款 ${c.refunded_amount.toFixed(2)}</span>
                    {c.rejection_reason && <span className="text-gray-500">原因: {c.rejection_reason}</span>}
                  </div>
                </div>
              )}

              {/* Section: 时间线 */}
              <div className="border-t border-gray-200 pt-4">
                <div className="text-xs text-gray-400 font-medium mb-4">时间线</div>
                <div className="flex items-start gap-0">
                  <TimelineNode label="创建" date={c.created_at} active />
                  <TimelineLine active={!!c.confirmed_at} />
                  <TimelineNode
                    label="确认"
                    date={c.confirmed_at}
                    sub={fmtMethod(c.confirmation_method)}
                    active={!!c.confirmed_at}
                  />
                  <TimelineLine active={!!c.paid_out_at} />
                  <TimelineNode label="发放" date={c.paid_out_at} active={!!c.paid_out_at} />
                </div>
              </div>

              {/* Manual confirm */}
              {isPending && (
                <div className="border-t border-gray-200 pt-4 flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                    disabled={confirmingId === c.id}
                    className="inline-flex items-center gap-1.5 text-[13px] px-4 py-[7px] rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all duration-150 disabled:opacity-50"
                  >
                    <IconCheck size={14} />
                    {confirmingId === c.id ? '确认中...' : '手动确认'}
                  </button>
                  <span className="text-xs text-gray-400">
                    已等待 {days} 天
                    {days >= 30
                      ? ' — 已满 30 天，下次 Cron 将自动确认'
                      : ` — ${30 - days} 天后自动确认`}
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

/* ── Detail Card ─────────────────────────────────────────────── */

function DetailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-gray-400 font-medium mb-1">{label}</div>
      {children}
    </div>
  );
}

/* ── Timeline ────────────────────────────────────────────────── */

function TimelineNode({ label, date, sub, active }: { label: string; date: string | null; sub?: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-[88px]">
      <div className={`w-3 h-3 rounded-full border-2 ${
        active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
      }`} />
      <div className={`text-xs font-medium mt-1.5 ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</div>
      <div className={`text-[11px] mt-0.5 ${active ? 'text-gray-500' : 'text-gray-300'}`}>{fmtDateFull(date)}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${active ? 'text-gray-400' : 'text-gray-300'}`}>{sub}</div>}
    </div>
  );
}

function TimelineLine({ active }: { active: boolean }) {
  return (
    <div className={`flex-1 h-0.5 min-w-[24px] mt-[5px] rounded ${active ? 'bg-blue-600' : 'bg-gray-200'}`} />
  );
}
