'use client';

import { useEffect, useState, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface RateRow {
  product_type: string;
  product_name: string;
  standard_rate: number;
  senior_rate: number;
  partner_rate: number;
}

interface RuleRow {
  tier: string;
  min_commission: number;
  description: string;
}

interface TierCounts {
  standard: number;
  senior: number;
  partner: number;
}

type Tier = 'standard' | 'senior' | 'partner';

// ── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_PRICES: Record<string, number> = {
  credit_starter: 4.99,
  credit_standard: 9.99,
  credit_pro: 19.99,
  credit_flagship: 49.99,
  sub_starter: 19.9,
  sub_pro: 49.0,
  sub_elite: 99.0,
};

const PRODUCT_DISPLAY: Record<string, { name: string }> = {
  credit_starter: { name: '积分 - 入门' },
  credit_standard: { name: '积分 - 标准' },
  credit_pro: { name: '积分 - 高级' },
  credit_flagship: { name: '积分 - 旗舰' },
  sub_starter: { name: '订阅 - Starter' },
  sub_pro: { name: '订阅 - Pro' },
  sub_elite: { name: '订阅 - Elite' },
};

const SUB_ORDER = ['sub_elite', 'sub_pro', 'sub_starter'];
const CREDIT_ORDER = ['credit_flagship', 'credit_pro', 'credit_standard', 'credit_starter'];

const TIERS: { key: Tier; label: string; dotCls: string; labelCls: string }[] = [
  { key: 'standard', label: 'Standard', dotCls: 'bg-gray-400', labelCls: 'text-[var(--tier-standard)]' },
  { key: 'senior', label: 'Senior', dotCls: 'bg-amber-500', labelCls: 'text-[var(--tier-senior)]' },
  { key: 'partner', label: 'Partner', dotCls: 'bg-purple-500', labelCls: 'text-[var(--tier-partner)]' },
];

// ── Toast Component ──────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${
        type === 'success'
          ? 'bg-green-50 dark:bg-green-900/80 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
          : 'bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
      }`}>
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700/60 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700/60 rounded mx-auto" />
            <div className="h-8 w-full bg-gray-100 dark:bg-gray-700/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NumberInput (prevents leading zeros) ─────────────────────────────────────

function NumberInput({
  value,
  onChange,
  disabled,
  prefix,
  focusBorderCls,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  prefix?: string;
  focusBorderCls?: string;
}) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value));

  useEffect(() => {
    setRaw(value === 0 ? '' : String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/[^0-9.]/g, '');
    // strip leading zeros (allow "0." for decimals)
    if (v.length > 1 && v[0] === '0' && v[1] !== '.') {
      v = v.replace(/^0+/, '');
    }
    setRaw(v);
    const n = Number(v);
    if (!isNaN(n)) onChange(n);
  }

  return (
    <div className="relative w-32">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] pointer-events-none">{prefix}</span>
      )}
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={raw}
        onChange={handleChange}
        placeholder="0"
        className={`w-full ${prefix ? 'pl-7' : 'pl-3'} pr-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm outline-none transition disabled:opacity-50 disabled:cursor-not-allowed ${focusBorderCls || 'focus:border-blue-500'}`}
      />
    </div>
  );
}

// ── Rate Cell ────────────────────────────────────────────────────────────────

function RateCell({
  tier,
  rate,
  price,
  disabled,
  onChange,
}: {
  tier: typeof TIERS[number];
  rate: number;
  price: number;
  disabled: boolean;
  onChange: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const pctDisplay = (rate * 100).toFixed(1).replace(/\.0$/, '');
  const commission = price * rate;

  function startEdit() {
    if (disabled) return;
    setInputVal(pctDisplay);
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) {
      const newDecimal = Math.round(parsed * 10) / 1000;
      if (Math.abs(newDecimal - rate) > 0.0001) {
        onChange(newDecimal);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <div className="text-center space-y-1">
      <div className="flex items-center justify-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.dotCls}`} />
        <span className={`text-xs font-medium ${tier.labelCls}`}>{tier.label}</span>
      </div>
      {editing ? (
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={inputVal}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*\.?\d*$/.test(v)) setInputVal(v);
            }}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-center text-xl font-medium py-1.5 rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-[var(--text-primary)] outline-none"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] pointer-events-none">%</span>
        </div>
      ) : (
        <button
          onClick={startEdit}
          disabled={disabled}
          className={`w-full text-xl font-medium py-1.5 rounded-lg transition ${
            disabled
              ? 'cursor-not-allowed text-[var(--text-tertiary)] bg-[var(--surface-raised)]'
              : 'cursor-pointer hover:bg-[var(--surface-raised)] text-[var(--text-primary)]'
          }`}
        >
          {pctDisplay}%
        </button>
      )}
      <div className="text-[13px] text-[var(--text-secondary)]">
        = ${commission.toFixed(2)}
      </div>
    </div>
  );
}

// ── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, badgeCls }: { title: string; badgeCls: string }) {
  return (
    <div className="col-span-full flex items-center gap-3 pt-2">
      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${badgeCls}`}>{title}</span>
      <div className="flex-1 h-px bg-[var(--card-border)]" />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TierManagementPage() {
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [counts, setCounts] = useState<TierCounts>({ standard: 0, senior: 0, partner: 0 });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'rates' | 'rules'>('rates');
  const [dirtyRates, setDirtyRates] = useState<Map<string, number>>(new Map());
  const [dirtyRules, setDirtyRules] = useState<Map<string, { min_commission?: number }>>(new Map());
  const [savingRates, setSavingRates] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => { setIsSuperAdmin(d.role === 'super_admin'); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    fetch('/api/admin/tier-management')
      .then((r) => r.json())
      .then((d) => {
        setRates(d.rates || []);
        setRules(d.rules || []);
        setCounts(d.counts || { standard: 0, senior: 0, partner: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Rate helpers ──

  function handleRateChange(productType: string, tier: Tier, newRate: number) {
    const key = `${productType}:${tier}`;
    setDirtyRates((prev) => {
      const next = new Map(prev);
      const original = rates.find((r) => r.product_type === productType);
      const originalRate = original ? original[`${tier}_rate` as keyof RateRow] as number : 0;
      if (Math.abs(newRate - originalRate) < 0.0001) next.delete(key);
      else next.set(key, newRate);
      return next;
    });
  }

  function getEffectiveRate(productType: string, tier: Tier): number {
    const key = `${productType}:${tier}`;
    if (dirtyRates.has(key)) return dirtyRates.get(key)!;
    const row = rates.find((r) => r.product_type === productType);
    if (!row) return 0;
    return row[`${tier}_rate` as keyof RateRow] as number;
  }

  async function saveAllRates() {
    if (dirtyRates.size === 0) return;
    const affectedProducts = new Set(Array.from(dirtyRates.keys()).map((k) => k.split(':')[0]));
    for (const pt of affectedProducts) {
      const std = getEffectiveRate(pt, 'standard');
      const sen = getEffectiveRate(pt, 'senior');
      const par = getEffectiveRate(pt, 'partner');
      const name = PRODUCT_DISPLAY[pt]?.name || pt;
      if (std >= sen) { showToast(`${name}: Standard ≥ Senior，请修正`, 'error'); return; }
      if (sen >= par) { showToast(`${name}: Senior ≥ Partner，请修正`, 'error'); return; }
    }
    setSavingRates(true);
    try {
      const entries = Array.from(dirtyRates.entries());
      const results = await Promise.all(
        entries.map(([key, rate]) => {
          const [product_type, tier] = key.split(':');
          return fetch('/api/admin/tier-management/rates', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_type, tier, commission_rate: rate }),
          });
        })
      );
      if (results.every((r) => r.ok)) {
        setRates((prev) =>
          prev.map((row) => {
            const updated = { ...row };
            for (const [key, rate] of entries) {
              const [pt, tier] = key.split(':');
              if (pt === row.product_type) (updated as Record<string, unknown>)[`${tier}_rate`] = rate;
            }
            return updated as RateRow;
          })
        );
        setDirtyRates(new Map());
        showToast('佣金比例已保存', 'success');
      } else {
        showToast('部分保存失败，请重试', 'error');
      }
    } catch {
      showToast('保存失败，请重试', 'error');
    }
    setSavingRates(false);
  }

  // ── Rule helpers ──

  function handleRuleCommissionChange(tier: string, value: number) {
    setDirtyRules((prev) => {
      const next = new Map(prev);
      const original = rules.find((r) => r.tier === tier);
      if (original && Math.abs(value - original.min_commission) < 0.01) next.delete(tier);
      else next.set(tier, { min_commission: value });
      return next;
    });
  }

  function getEffectiveRuleCommission(tier: string): number {
    const dirty = dirtyRules.get(tier);
    if (dirty?.min_commission !== undefined) return dirty.min_commission;
    return rules.find((r) => r.tier === tier)?.min_commission ?? 0;
  }

  async function saveAllRules() {
    if (dirtyRules.size === 0) return;
    setSavingRules(true);
    try {
      const entries = Array.from(dirtyRules.entries());
      const results = await Promise.all(
        entries.map(([tier, changes]) => {
          const original = rules.find((r) => r.tier === tier);
          return fetch('/api/admin/tier-management/rules', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tier,
              min_commission: changes.min_commission ?? original?.min_commission ?? 0,
            }),
          });
        })
      );
      if (results.every((r) => r.ok)) {
        setRules((prev) =>
          prev.map((row) => {
            const changes = dirtyRules.get(row.tier);
            if (!changes) return row;
            return { ...row, min_commission: changes.min_commission ?? row.min_commission };
          })
        );
        setDirtyRules(new Map());
        showToast('晋级规则已保存', 'success');
      } else {
        showToast('部分保存失败，请重试', 'error');
      }
    } catch {
      showToast('保存失败，请重试', 'error');
    }
    setSavingRules(false);
  }

  // ── Sort rates into groups ──

  const subRates = SUB_ORDER.map(pt => rates.find(r => r.product_type === pt)).filter(Boolean) as RateRow[];
  const creditRates = CREDIT_ORDER.map(pt => rates.find(r => r.product_type === pt)).filter(Boolean) as RateRow[];

  const disabled = !isSuperAdmin;

  return (
    <div className="tier-page space-y-5 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[var(--text-primary)]">等级管理</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          管理 Sales 等级佣金比例和晋级规则
          <span className="text-[var(--text-tertiary)] ml-2">(仅 Super Admin 可编辑)</span>
        </p>
      </div>

      {/* Permission banner */}
      {authChecked && !isSuperAdmin && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>仅 Super Admin 可编辑等级设置</span>
        </div>
      )}

      {/* Tabs — solid 2px underline */}
      <div className="border-b border-[var(--card-border)]">
        <div className="flex gap-0 -mb-px">
          {([['rates', '等级佣金比例'], ['rules', '晋级规则']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm transition-all duration-150 border-b-2 ${
                activeTab === key
                  ? 'font-medium text-[var(--text-primary)] border-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Rates ──────────────────────────────────── */}
      {activeTab === 'rates' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subscriptions group */}
              <SectionHeader title="订阅产品" badgeCls="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              {subRates.map((row) => (
                <ProductCard
                  key={row.product_type}
                  row={row}
                  disabled={disabled}
                  getEffectiveRate={getEffectiveRate}
                  onRateChange={handleRateChange}
                />
              ))}

              {/* Credits group */}
              <SectionHeader title="积分包" badgeCls="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
              {creditRates.map((row) => (
                <ProductCard
                  key={row.product_type}
                  row={row}
                  disabled={disabled}
                  getEffectiveRate={getEffectiveRate}
                  onRateChange={handleRateChange}
                />
              ))}
            </div>
          )}

          {dirtyRates.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
              <button
                onClick={saveAllRates}
                disabled={savingRates}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white text-sm font-medium shadow-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {savingRates ? '保存中...' : `保存修改 (${dirtyRates.size} 项)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Tab 2: Rules ──────────────────────────────────── */}
      {activeTab === 'rules' && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.5px]">等级</th>
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.5px]">累计佣金 &ge;</th>
                  <th className="text-right px-4 py-3 text-[12px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.5px]">当前人数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {/* Standard */}
                <tr>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                      <span className="font-medium text-[var(--tier-standard)]">Standard</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-[var(--text-tertiary)]">默认等级</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{counts.standard}</span>
                  </td>
                </tr>
                {/* Senior */}
                <tr>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="font-medium text-[var(--tier-senior)]">Senior</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <NumberInput
                      value={getEffectiveRuleCommission('senior')}
                      onChange={(v) => handleRuleCommissionChange('senior', v)}
                      disabled={disabled}
                      prefix="$"
                      focusBorderCls="focus:border-amber-400"
                    />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-[var(--tier-senior)]">{counts.senior}</span>
                  </td>
                </tr>
                {/* Partner */}
                <tr>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span className="font-medium text-[var(--tier-partner)]">Partner</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <NumberInput
                      value={getEffectiveRuleCommission('partner')}
                      onChange={(v) => handleRuleCommissionChange('partner', v)}
                      disabled={disabled}
                      prefix="$"
                      focusBorderCls="focus:border-purple-400"
                    />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-[var(--tier-partner)]">{counts.partner}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-4 py-4 border-t border-[var(--card-border)] flex justify-end">
            <button
              onClick={saveAllRules}
              disabled={dirtyRules.size === 0 || savingRules || disabled}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {savingRules ? '保存中...' : '保存规则'}
            </button>
          </div>
        </div>
      )}

      {/* CSS Variables for light/dark mode */}
      <style>{`
        .tier-page {
          --text-primary: #111827;
          --text-secondary: #6b7280;
          --text-tertiary: #9ca3af;
          --card-bg: #ffffff;
          --card-border: #e5e7eb;
          --surface-raised: #f9fafb;
          --tier-standard: #6b7280;
          --tier-senior: #d97706;
          --tier-partner: #9333ea;
        }
        @media (prefers-color-scheme: dark) {
          .tier-page {
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            --text-tertiary: #6b7280;
            --card-bg: #1f2937;
            --card-border: #374151;
            --surface-raised: #111827;
            --tier-standard: #9ca3af;
            --tier-senior: #fbbf24;
            --tier-partner: #c084fc;
          }
        }
        .dark .tier-page {
          --text-primary: #f3f4f6;
          --text-secondary: #9ca3af;
          --text-tertiary: #6b7280;
          --card-bg: #1f2937;
          --card-border: #374151;
          --surface-raised: #111827;
          --tier-standard: #9ca3af;
          --tier-senior: #fbbf24;
          --tier-partner: #c084fc;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out; }
      `}</style>
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  row,
  disabled,
  getEffectiveRate,
  onRateChange,
}: {
  row: RateRow;
  disabled: boolean;
  getEffectiveRate: (pt: string, tier: Tier) => number;
  onRateChange: (pt: string, tier: Tier, val: number) => void;
}) {
  const display = PRODUCT_DISPLAY[row.product_type] || { name: row.product_name || row.product_type };
  const price = PRODUCT_PRICES[row.product_type] ?? 0;
  const isSub = row.product_type.startsWith('sub_');

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-[var(--text-primary)]">{display.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[var(--text-secondary)]">{row.product_type}</span>
            {price > 0 && (
              <span className="text-xs text-[var(--text-secondary)]">
                ${price.toFixed(2)}{isSub && '/月'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-[var(--card-border)] pt-4">
        {TIERS.map((tier) => (
          <RateCell
            key={tier.key}
            tier={tier}
            rate={getEffectiveRate(row.product_type, tier.key)}
            price={price}
            disabled={disabled}
            onChange={(val) => onRateChange(row.product_type, tier.key, val)}
          />
        ))}
      </div>
    </div>
  );
}
