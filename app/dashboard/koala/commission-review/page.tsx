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
import { MetricLabel } from '../../../../components/ui/metric-label';

interface Commission {
  id: string;
  agent_name: string;
  agent_email: string;
  agent_referral_code: string;
  agent_tier: string;
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

interface Summary {
  pendingPayoutAmount: number;
  pendingPayoutCount: number;
  paidThisMonth: number;
  pendingConfirmCount: number;
}

const STATUS_CFG: Record<string, { label: string; tw: string }> = {
  pending:   { label: '待确认', tw: 'bg-amber-50 text-amber-700 border border-amber-200' },
  confirmed: { label: '已确认', tw: 'bg-green-50 text-green-700 border border-green-200' },
  paid_out:  { label: '已发放', tw: 'bg-blue-50 text-blue-700 border border-blue-200' },
  rejected:  { label: '已拒绝', tw: 'bg-red-50 text-red-700 border border-red-200' },
  refunded:  { label: '已退款', tw: 'bg-gray-50 text-gray-600 border border-gray-200' },
};

const TIER_LABEL: Record<string, string> = {
  standard: 'Standard',
  senior: 'Senior',
  partner: 'Partner',
};

const TABS = [
  { key: 'confirmed', label: '已确认' },
  { key: 'pending', label: '待确认' },
  { key: 'paid_out', label: '已发放' },
  { key: 'all', label: '全部' },
];

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

function fmtDateShort(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
}

function fmtDateFull(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
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
  const [summary, setSummary] = useState<Summary>({ pendingPayoutAmount: 0, pendingPayoutCount: 0, paidThisMonth: 0, pendingConfirmCount: 0 });
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
      setSummary(d.summary || { pendingPayoutAmount: 0, pendingPayoutCount: 0, paidThisMonth: 0, pendingConfirmCount: 0 });
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

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-light tracking-tight text-gray-900">佣金审核发放</h1>

      {/* ── 4 Metric Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="待发放总额"
          tooltip="已确认但尚未发放的佣金总金额（AUD）"
          value={`$${summary.pendingPayoutAmount.toFixed(2)}`}
        />
        <MetricCard
          label="待发放笔数"
          tooltip="状态为「已确认」等待发放的佣金记录数"
          value={String(summary.pendingPayoutCount)}
        />
        <MetricCard
          label="本月已发放"
          tooltip="本自然月内已标记为「已发放」的佣金总额（AUD）"
          value={`$${summary.paidThisMonth.toFixed(2)}`}
        />
        <MetricCard
          label="待确认笔数"
          tooltip="状态为「待确认」的佣金记录数，满 30 天后将自动确认"
          value={String(summary.pendingConfirmCount)}
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2.5 text-sm transition-all duration-150 ${
                statusFilter === tab.key
                  ? 'font-medium text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-2">加载中...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
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
                  <TH align="left">日期</TH>
                  <TH align="left">销售</TH>
                  <TH align="left">用户</TH>
                  <TH align="left">产品</TH>
                  <TH align="right">支付</TH>
                  <TH align="center">比例</TH>
                  <TH align="right">佣金</TH>
                  <TH align="center">状态</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commissions.map(c => (
                  <CommissionRow
                    key={c.id}
                    c={c}
                    isExpanded={expandedId === c.id}
                    showCheckbox={showCheckbox}
                    isSelected={selected.has(c.id)}
                    confirmingId={confirmingId}
                    onToggleSelect={() => toggleSelect(c.id)}
                    onToggleExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    onConfirm={() => manualConfirm(c.id)}
                    onAgentClick={() => setAgentModalData(c)}
                  />
                ))}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={showCheckbox ? 11 : 10} className="px-3 py-12 text-center text-gray-400 text-sm">
                      暂无佣金记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Batch payout bar ──────────────────────────────── */}
      {statusFilter === 'confirmed' && selected.size > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-3 flex items-center justify-between shadow-lg rounded-b-lg">
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

      {/* ── Agent payment modal ───────────────────────────── */}
      {agentModalData && (
        <AgentPaymentModal c={agentModalData} onClose={() => setAgentModalData(null)} />
      )}
    </div>
  );
}

/* ── Metric Card ───────────────────────────────────────────── */

function MetricCard({ label, tooltip, value }: { label: string; tooltip: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <MetricLabel label={label} tooltip={tooltip} />
      <div className="text-2xl font-medium text-gray-900 mt-1 tabular-nums">{value}</div>
    </div>
  );
}

/* ── Table Header ──────────────────────────────────────────── */

function TH({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return (
    <th className={`px-3 py-3 text-[12px] uppercase tracking-[0.5px] text-gray-400 font-medium text-${align}`}>
      {children}
    </th>
  );
}

/* ── Commission Row ────────────────────────────────────────── */

function CommissionRow({
  c, isExpanded, showCheckbox, isSelected, confirmingId,
  onToggleSelect, onToggleExpand, onConfirm, onAgentClick,
}: {
  c: Commission;
  isExpanded: boolean;
  showCheckbox: boolean;
  isSelected: boolean;
  confirmingId: string | null;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onConfirm: () => void;
  onAgentClick: () => void;
}) {
  const cfg = STATUS_CFG[c.status] || STATUS_CFG.pending;
  const isPending = c.status === 'pending';
  const days = daysSince(c.created_at);
  const colCount = showCheckbox ? 11 : 10;
  const colorCls = avatarColor(c.agent_name);

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors duration-100 ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
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
        <td className="px-3 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">{fmtDateShort(c.created_at)}</td>

        {/* Sales agent — avatar + display_name + code/tier */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${colorCls}`}>
              {initial(c.agent_name)}
            </div>
            <div className="min-w-0">
              <button
                onClick={(e) => { e.stopPropagation(); onAgentClick(); }}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors duration-150 text-left truncate block"
              >
                {c.agent_name}
              </button>
              <div className="text-[11px] text-gray-400 truncate">
                {c.agent_referral_code || '—'} · {TIER_LABEL[c.agent_tier] || c.agent_tier}
              </div>
            </div>
          </div>
        </td>

        <td className="px-3 py-3 text-sm text-gray-600 truncate max-w-[140px]">{c.user_name}</td>
        <td className="px-3 py-3 text-sm text-gray-600 truncate max-w-[120px]">{c.product_name || c.product_type}</td>
        <td className="px-3 py-3 text-right text-sm text-gray-600 tabular-nums whitespace-nowrap">${c.payment_amount.toFixed(2)}</td>
        <td className="px-3 py-3 text-center text-xs text-gray-400 tabular-nums">{(c.commission_rate * 100).toFixed(0)}%</td>
        <td className="px-4 py-3 text-right">
          <span className="text-base font-medium tabular-nums" style={{ color: '#639922' }}>
            ${c.commission_amount.toFixed(2)}
          </span>
        </td>
        <td className="px-3 py-3 text-center">
          <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded font-medium ${cfg.tw}`}>
            {cfg.label}
          </span>
        </td>
      </tr>

      {/* ── Drill-down expanded row ─────────────────────── */}
      {isExpanded && (
        <tr>
          <td colSpan={colCount} className="px-0 py-0">
            <div className="bg-white border-t border-b border-gray-100 px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: sales info */}
                <div className="space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.5px] text-gray-400 font-medium mb-2">销售信息</div>
                  <DetailRow label="名称" value={c.agent_name} copyable />
                  <DetailRow label="邮箱" value={c.agent_email} copyable />
                  <DetailRow label="等级" value={TIER_LABEL[c.agent_tier] || c.agent_tier} />
                  <DetailRow label="付款账户" value={c.agent_payment_account} copyable />
                </div>

                {/* Middle: payment details */}
                <div className="space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.5px] text-gray-400 font-medium mb-2">支付详情</div>
                  <DetailRow label="支付金额" value={`$${c.payment_amount.toFixed(2)} AUD`} copyable />
                  <DetailRow label="产品" value={c.product_name || c.product_type} />
                  <DetailRow label="Stripe ID" value={c.stripe_payment_id} copyable mono />
                  <DetailRow label="佣金计算" value={`$${c.payment_amount.toFixed(2)} × ${(c.commission_rate * 100).toFixed(0)}% = $${c.commission_amount.toFixed(2)}`} />
                </div>

                {/* Right: timeline */}
                <div>
                  <div className="text-[11px] uppercase tracking-[0.5px] text-gray-400 font-medium mb-3">时间线</div>
                  <div className="space-y-0">
                    <TimelineStep label="创建" date={c.created_at} active />
                    <TimelineStep
                      label="确认"
                      date={c.confirmed_at}
                      sub={fmtMethod(c.confirmation_method)}
                      active={!!c.confirmed_at}
                    />
                    <TimelineStep label="发放" date={c.paid_out_at} active={!!c.paid_out_at} isLast />
                  </div>
                </div>
              </div>

              {/* Payout info */}
              {(c.payout_reference || c.payout_method || c.payout_note) && (
                <div className="border-t border-gray-100 mt-5 pt-4 grid grid-cols-3 gap-6">
                  <DetailRow label="发放方式" value={c.payout_method} />
                  <DetailRow label="发放凭证" value={c.payout_reference} copyable mono />
                  <DetailRow label="备注" value={c.payout_note} />
                </div>
              )}

              {/* Refund info */}
              {c.refunded_amount != null && c.refunded_amount > 0 && (
                <div className="border-t border-gray-100 mt-5 pt-4 flex items-center gap-4 text-sm">
                  <span className="text-red-600 font-medium">退款 ${c.refunded_amount.toFixed(2)}</span>
                  {c.rejection_reason && <span className="text-gray-500">原因: {c.rejection_reason}</span>}
                </div>
              )}

              {/* Manual confirm button */}
              {isPending && (
                <div className="border-t border-gray-100 mt-5 pt-4 flex items-center gap-3">
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

/* ── Detail Row (for drill-down) ───────────────────────────── */

function DetailRow({ label, value, copyable, mono }: { label: string; value: string | null; copyable?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right flex items-center gap-0.5 ${mono ? 'font-mono text-xs' : ''}`}>
        <span className="truncate max-w-[200px]">{value || '—'}</span>
        {copyable && value && <CopyBtn value={value} label={label} />}
      </span>
    </div>
  );
}

/* ── Vertical Timeline ─────────────────────────────────────── */

function TimelineStep({ label, date, sub, active, isLast }: {
  label: string; date: string | null; sub?: string; active: boolean; isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full border-2 mt-0.5 ${
          active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
        }`} />
        {!isLast && <div className={`w-px flex-1 min-h-[28px] ${active ? 'bg-blue-200' : 'bg-gray-200'}`} />}
      </div>
      <div className="pb-4">
        <div className={`text-xs font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</div>
        <div className={`text-[11px] ${active ? 'text-gray-500' : 'text-gray-300'}`}>{fmtDateFull(date)}</div>
        {sub && <div className={`text-[10px] ${active ? 'text-gray-400' : 'text-gray-300'}`}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Agent Payment Modal ───────────────────────────────────── */

function AgentPaymentModal({ c, onClose }: { c: Commission; onClose: () => void }) {
  const colorCls = avatarColor(c.agent_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-lg w-full max-w-sm mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${colorCls}`}>
              {initial(c.agent_name)}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{c.agent_name}</div>
              <div className="text-xs text-gray-400">{c.agent_referral_code} · {TIER_LABEL[c.agent_tier] || c.agent_tier}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors duration-150">
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <IconCreditCard size={14} />
            <span className="font-medium uppercase tracking-[0.5px]">付款资料</span>
          </div>

          <InfoRow label="邮箱" value={c.agent_email} copyable />
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
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 font-medium flex items-center">
        {value || '—'}
        {copyable && value && <CopyBtn value={value} label={label} />}
      </span>
    </div>
  );
}
