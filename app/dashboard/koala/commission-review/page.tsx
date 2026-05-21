'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  IconChevronDown,
  IconChevronRight,
  IconCheck,
  IconCopy,
  IconX,
  IconCreditCard,
} from '@tabler/icons-react';
import { MetricLabel } from '../../../../components/ui/metric-label';

/* ── Types ─────────────────────────────────────────────────── */

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

/* ── Constants ─────────────────────────────────────────────── */

const STATUS_CFG: Record<string, { label: string; light: string; dark: string }> = {
  pending:   { label: '待确认', light: 'bg-amber-50 text-amber-700 border border-amber-200', dark: 'bg-amber-900/20 text-amber-400 border border-amber-800' },
  confirmed: { label: '已确认', light: 'bg-green-50 text-green-700 border border-green-200', dark: 'bg-green-900/20 text-green-400 border border-green-800' },
  paid_out:  { label: '已发放', light: 'bg-blue-50 text-blue-700 border border-blue-200', dark: 'bg-blue-900/20 text-blue-400 border border-blue-800' },
  rejected:  { label: '已拒绝', light: 'bg-red-50 text-red-700 border border-red-200', dark: 'bg-red-900/20 text-red-400 border border-red-800' },
  refunded:  { label: '已退款', light: 'bg-gray-50 text-gray-600 border border-gray-200', dark: 'bg-gray-800 text-gray-400 border border-gray-700' },
};

const TIER_LABEL: Record<string, string> = {
  standard: 'Standard',
  senior: 'Senior',
  partner: 'Partner',
};

const TIER_COLOR: Record<string, string> = {
  standard: 'var(--tier-standard)',
  senior:   'var(--tier-senior)',
  partner:  'var(--tier-partner)',
};

const TABS = [
  { key: 'confirmed', label: '已确认' },
  { key: 'pending', label: '待确认' },
  { key: 'paid_out', label: '已发放' },
  { key: 'all', label: '全部' },
];

const AVATAR_COLORS = [
  ['bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400'],
  ['bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400'],
  ['bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400'],
  ['bg-purple-100 text-purple-700', 'bg-purple-900/30 text-purple-400'],
  ['bg-rose-100 text-rose-700', 'bg-rose-900/30 text-rose-400'],
  ['bg-cyan-100 text-cyan-700', 'bg-cyan-900/30 text-cyan-400'],
];

/* ── Helpers ───────────────────────────────────────────────── */

function avatarColorIdx(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % AVATAR_COLORS.length;
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

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const hasDarkClass = () => document.documentElement.classList.contains('dark');
    setDark(mq.matches || hasDarkClass());
    const handler = () => setDark(mq.matches || hasDarkClass());
    mq.addEventListener('change', handler);
    const obs = new MutationObserver(() => setDark(mq.matches || hasDarkClass()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { mq.removeEventListener('change', handler); obs.disconnect(); };
  }, []);
  return dark;
}

/* ── Toast ─────────────────────────────────────────────────── */

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg pl-0 pr-4 py-3 shadow-lg animate-in slide-in-from-top-2"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div className="w-1 h-full rounded-l-lg bg-green-500 self-stretch" />
      <span className="text-sm ml-3" style={{ color: 'var(--text-secondary)' }}>{message}</span>
      <button onClick={onClose} className="ml-1 transition-colors duration-150" style={{ color: 'var(--text-tertiary)' }}>
        <IconX size={14} />
      </button>
    </div>
  );
}

/* ── CopyBtn ───────────────────────────────────────────────── */

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
        className="inline-flex items-center hover:text-blue-600 transition-colors duration-150 ml-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <IconCopy size={12} stroke={1.5} />
      </button>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════════ */

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
  const isDark = useIsDark();

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
    <div className="commission-page space-y-5">
      <h1 className="text-2xl font-light tracking-tight" style={{ color: 'var(--text-primary)' }}>
        佣金审核发放
      </h1>

      {/* ── 4 Metric Cards (grid 4 col) ───────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="待发放总额" tooltip="已确认但尚未发放的佣金总金额（AUD）" value={`$${summary.pendingPayoutAmount.toFixed(2)}`} />
        <MetricCard label="待发放笔数" tooltip="状态为「已确认」等待发放的佣金记录数" value={String(summary.pendingPayoutCount)} />
        <MetricCard label="本月已发放" tooltip="本自然月内已标记为「已发放」的佣金总额（AUD）" value={`$${summary.paidThisMonth.toFixed(2)}`} />
        <MetricCard label="待确认" tooltip="状态为「待确认」的佣金记录数，满 30 天后将自动确认" value={String(summary.pendingConfirmCount)} />
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--card-border)' }}>
        <div className="flex gap-0 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className="px-4 py-2.5 text-sm transition-all duration-150 border-b-2"
              style={{
                fontWeight: statusFilter === tab.key ? 500 : 400,
                color: statusFilter === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottomColor: statusFilter === tab.key ? 'var(--text-primary)' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--card-border)', borderTopColor: 'var(--accent, #2563eb)' }} />
          <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>加载中...</p>
        </div>
      ) : (
        <div className="rounded-lg shadow-sm overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
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
              <tbody>
                {commissions.map(c => (
                  <CommissionRow
                    key={c.id}
                    c={c}
                    isDark={isDark}
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
                    <td colSpan={showCheckbox ? 11 : 10} className="px-3 py-12 text-center text-sm"
                      style={{ color: 'var(--text-tertiary)' }}>
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
        <div className="sticky bottom-0 left-0 right-0 px-5 py-3 flex items-center justify-between shadow-lg rounded-b-lg"
          style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--card-border)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            已选 <strong style={{ color: 'var(--text-primary)' }}>{selected.size}</strong> 笔，共{' '}
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
        <AgentPaymentModal c={agentModalData} isDark={isDark} onClose={() => setAgentModalData(null)} />
      )}

      {/* ── CSS Variables ─────────────────────────────────── */}
      <style>{`
        .commission-page {
          --text-primary: #111827;
          --text-secondary: #6b7280;
          --text-tertiary: #9ca3af;
          --card-bg: #ffffff;
          --card-border: #e5e7eb;
          --surface-raised: #f9fafb;
          --tier-standard: #6b7280;
          --tier-senior: #d97706;
          --tier-partner: #9333ea;
          --commission-green: #16a34a;
        }
        @media (prefers-color-scheme: dark) {
          .commission-page {
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            --text-tertiary: #6b7280;
            --card-bg: #1f2937;
            --card-border: #374151;
            --surface-raised: #111827;
            --tier-standard: #9ca3af;
            --tier-senior: #fbbf24;
            --tier-partner: #c084fc;
            --commission-green: #4ade80;
          }
        }
        .dark .commission-page {
          --text-primary: #f3f4f6;
          --text-secondary: #9ca3af;
          --text-tertiary: #6b7280;
          --card-bg: #1f2937;
          --card-border: #374151;
          --surface-raised: #111827;
          --tier-standard: #9ca3af;
          --tier-senior: #fbbf24;
          --tier-partner: #c084fc;
          --commission-green: #4ade80;
        }
        .commission-page tr.row-hover:hover {
          background: var(--surface-raised);
        }
      `}</style>
    </div>
  );
}

/* ── Metric Card ──────────────────────────────────────────── */

function MetricCard({ label, tooltip, value }: { label: string; tooltip: string; value: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--surface-raised)' }}>
      <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        <MetricLabel label={label} tooltip={tooltip} />
      </div>
      <div className="text-2xl font-medium mt-1 tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

/* ── Table Header ─────────────────────────────────────────── */

function TH({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return (
    <th
      className="px-3 py-3 text-[12px] uppercase tracking-[0.5px] font-medium"
      style={{ color: 'var(--text-tertiary)', textAlign: align }}
    >
      {children}
    </th>
  );
}

/* ── Commission Row ───────────────────────────────────────── */

function CommissionRow({
  c, isDark, isExpanded, showCheckbox, isSelected, confirmingId,
  onToggleSelect, onToggleExpand, onConfirm, onAgentClick,
}: {
  c: Commission;
  isDark: boolean;
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
  const colorIdx = avatarColorIdx(c.agent_name);
  const avatarCls = isDark ? AVATAR_COLORS[colorIdx][1] : AVATAR_COLORS[colorIdx][0];
  const badgeCls = isDark ? cfg.dark : cfg.light;
  const tierColor = TIER_COLOR[c.agent_tier] || 'var(--text-tertiary)';

  return (
    <>
      <tr
        className={`row-hover cursor-pointer transition-colors duration-100 ${isSelected ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50/60') : ''}`}
        onClick={onToggleExpand}
        style={{ borderBottom: '1px solid var(--card-border)' }}
      >
        {showCheckbox && (
          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="accent-blue-600 w-3.5 h-3.5" />
          </td>
        )}
        <td className="px-1 py-3" style={{ color: 'var(--text-tertiary)' }}>
          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </td>
        <td className="px-3 py-3 text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
          {fmtDateShort(c.created_at)}
        </td>

        {/* Sales agent — 28px avatar + display_name(14px) + tier badge(11px) */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${avatarCls}`}>
              {initial(c.agent_name)}
            </div>
            <div className="min-w-0">
              <button
                onClick={(e) => { e.stopPropagation(); onAgentClick(); }}
                className="text-[14px] font-medium hover:text-blue-600 transition-colors duration-150 text-left truncate block"
                style={{ color: 'var(--text-primary)' }}
              >
                {c.agent_name}
              </button>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {c.agent_referral_code || '—'}
                </span>
                <span
                  className="text-[11px] font-medium px-1.5 py-px rounded"
                  style={{
                    color: tierColor,
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  {TIER_LABEL[c.agent_tier] || c.agent_tier}
                </span>
              </div>
            </div>
          </div>
        </td>

        <td className="px-3 py-3 text-sm truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>
          {c.user_name}
        </td>
        <td className="px-3 py-3 text-sm truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>
          {c.product_name || c.product_type}
        </td>
        <td className="px-3 py-3 text-right text-sm tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
          ${c.payment_amount.toFixed(2)}
        </td>
        <td className="px-3 py-3 text-center text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          {(c.commission_rate * 100).toFixed(0)}%
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-base font-medium tabular-nums" style={{ color: 'var(--commission-green)' }}>
            ${c.commission_amount.toFixed(2)}
          </span>
        </td>
        <td className="px-3 py-3 text-center">
          <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded font-medium ${badgeCls}`}>
            {cfg.label}
          </span>
        </td>
      </tr>

      {/* ── Drill-down expanded row ─────────────────────── */}
      {isExpanded && (
        <tr>
          <td colSpan={colCount} className="px-0 py-0">
            <div className="px-6 py-5" style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)' }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: sales info + payment account */}
                <div className="space-y-3">
                  <SectionHeader>销售信息</SectionHeader>
                  <DetailRow label="名称" value={c.agent_name} copyable />
                  <DetailRow label="邮箱" value={c.agent_email} copyable />
                  <DetailRow label="等级" value={TIER_LABEL[c.agent_tier] || c.agent_tier} />
                  <DetailRow label="付款方式" value={c.agent_payment_method} />
                  <DetailRow label="付款账户" value={c.agent_payment_account} copyable />
                  <DetailRow label="账户姓名" value={c.agent_payment_name} copyable />
                </div>

                {/* Middle: payment details */}
                <div className="space-y-3">
                  <SectionHeader>支付详情</SectionHeader>
                  <DetailRow label="支付金额" value={`$${c.payment_amount.toFixed(2)} AUD`} copyable />
                  <DetailRow label="产品" value={c.product_name || c.product_type} />
                  <DetailRow label="Stripe ID" value={c.stripe_payment_id} copyable mono />
                  <DetailRow label="Invoice ID" value={c.stripe_invoice_id} copyable mono />
                  <DetailRow label="佣金计算" value={`$${c.payment_amount.toFixed(2)} × ${(c.commission_rate * 100).toFixed(0)}% = $${c.commission_amount.toFixed(2)}`} />
                </div>

                {/* Right: timeline */}
                <div>
                  <SectionHeader>时间线</SectionHeader>
                  <div className="mt-3 space-y-0">
                    <TimelineStep label="创建" date={c.created_at} active />
                    <TimelineStep label="确认" date={c.confirmed_at} sub={fmtMethod(c.confirmation_method)} active={!!c.confirmed_at} />
                    <TimelineStep label="发放" date={c.paid_out_at} active={!!c.paid_out_at} isLast />
                  </div>
                </div>
              </div>

              {/* Payout info */}
              {(c.payout_reference || c.payout_method || c.payout_note) && (
                <div className="mt-5 pt-4 grid grid-cols-3 gap-6" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <DetailRow label="发放方式" value={c.payout_method} />
                  <DetailRow label="发放凭证" value={c.payout_reference} copyable mono />
                  <DetailRow label="备注" value={c.payout_note} />
                </div>
              )}

              {/* Refund info */}
              {c.refunded_amount != null && c.refunded_amount > 0 && (
                <div className="mt-5 pt-4 flex items-center gap-4 text-sm" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <span className="text-red-500 font-medium">退款 ${c.refunded_amount.toFixed(2)}</span>
                  {c.rejection_reason && <span style={{ color: 'var(--text-secondary)' }}>原因: {c.rejection_reason}</span>}
                </div>
              )}

              {/* Manual confirm button */}
              {isPending && (
                <div className="mt-5 pt-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                    disabled={confirmingId === c.id}
                    className="inline-flex items-center gap-1.5 text-[13px] px-4 py-[7px] rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all duration-150 disabled:opacity-50"
                  >
                    <IconCheck size={14} />
                    {confirmingId === c.id ? '确认中...' : '手动确认'}
                  </button>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
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

/* ── Section Header ───────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.5px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
      {children}
    </div>
  );
}

/* ── Detail Row (for drill-down) ──────────────────────────── */

function DetailRow({ label, value, copyable, mono }: { label: string; value: string | null; copyable?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5">
      <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className={`text-sm text-right flex items-center gap-0.5 ${mono ? 'font-mono text-xs' : ''}`} style={{ color: 'var(--text-primary)' }}>
        <span className="truncate max-w-[200px]">{value || '—'}</span>
        {copyable && value && <CopyBtn value={value} label={label} />}
      </span>
    </div>
  );
}

/* ── Vertical Timeline ────────────────────────────────────── */

function TimelineStep({ label, date, sub, active, isLast }: {
  label: string; date: string | null; sub?: string; active: boolean; isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full border-2 mt-0.5 ${
          active ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
        }`} style={active ? {} : { background: 'var(--card-bg)' }} />
        {!isLast && <div className={`w-px flex-1 min-h-[28px] ${active ? 'bg-blue-200' : ''}`}
          style={active ? {} : { background: 'var(--card-border)' }} />}
      </div>
      <div className="pb-4">
        <div className="text-xs font-medium" style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          {label}
        </div>
        <div className="text-[11px]" style={{ color: active ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
          {fmtDateFull(date)}
        </div>
        {sub && <div className="text-[10px]" style={{ color: active ? 'var(--text-tertiary)' : 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Agent Payment Modal ──────────────────────────────────── */

function AgentPaymentModal({ c, isDark, onClose }: { c: Commission; isDark: boolean; onClose: () => void }) {
  const colorIdx = avatarColorIdx(c.agent_name);
  const avatarCls = isDark ? AVATAR_COLORS[colorIdx][1] : AVATAR_COLORS[colorIdx][0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="rounded-lg shadow-lg w-full max-w-sm mx-4 p-6"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${avatarCls}`}>
              {initial(c.agent_name)}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.agent_name}</div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {c.agent_referral_code} · {TIER_LABEL[c.agent_tier] || c.agent_tier}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="transition-colors duration-150 hover:text-blue-600" style={{ color: 'var(--text-tertiary)' }}>
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
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
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--card-border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-sm font-medium flex items-center" style={{ color: 'var(--text-primary)' }}>
        {value || '—'}
        {copyable && value && <CopyBtn value={value} label={label} />}
      </span>
    </div>
  );
}
