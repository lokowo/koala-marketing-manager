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
  sub_starter: 4.99,
  sub_pro: 14.99,
  sub_elite: 29.99,
};

const PRODUCT_DISPLAY: Record<string, { name: string; type: string }> = {
  credit_starter: { name: '积分 - 入门', type: '积分包' },
  credit_standard: { name: '积分 - 标准', type: '积分包' },
  credit_pro: { name: '积分 - 高级', type: '积分包' },
  credit_flagship: { name: '积分 - 旗舰', type: '积分包' },
  sub_starter: { name: '订阅 - 入门', type: '月度订阅' },
  sub_pro: { name: '订阅 - 专业', type: '月度订阅' },
  sub_elite: { name: '订阅 - 精英', type: '月度订阅' },
};

const TIERS: { key: Tier; label: string; colorClass: string; bgClass: string; dotClass: string }[] = [
  { key: 'standard', label: 'Standard', colorClass: 'text-gray-500 dark:text-gray-400', bgClass: 'bg-gray-100 dark:bg-gray-700', dotClass: 'bg-gray-400' },
  { key: 'senior', label: 'Senior', colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-900/30', dotClass: 'bg-amber-500' },
  { key: 'partner', label: 'Partner', colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-900/30', dotClass: 'bg-purple-500' },
];

// ── Toast Component ──────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          type === 'success'
            ? 'bg-green-50 dark:bg-green-900/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
        }`}
      >
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700/60 rounded" />
        </div>
        <div className="h-5 w-14 bg-gray-100 dark:bg-gray-700/60 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700/60 rounded mx-auto" />
            <div className="h-8 w-full bg-gray-100 dark:bg-gray-700/60 rounded" />
            <div className="h-3 w-12 bg-gray-100 dark:bg-gray-700/60 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700/60 rounded" />
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700/60 rounded" />
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700/60 rounded" />
            <div className="h-4 w-12 bg-gray-100 dark:bg-gray-700/60 rounded" />
          </div>
        ))}
      </div>
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
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tier.dotClass}`} />
        <span className={`text-xs font-medium ${tier.colorClass}`}>{tier.label}</span>
      </div>
      {editing ? (
        <div>
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
              className="w-full text-center text-lg font-semibold py-1.5 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-gray-100 outline-none"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">%</span>
          </div>
        </div>
      ) : (
        <button
          onClick={startEdit}
          disabled={disabled}
          className={`w-full text-lg font-semibold py-1.5 rounded-lg transition ${
            disabled
              ? 'cursor-not-allowed text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800'
              : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}
        >
          {pctDisplay}%
        </button>
      )}
      <div className="text-[11px] text-gray-400 dark:text-gray-500">
        = ${commission.toFixed(2)}
      </div>
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

  // Dirty tracking for rates: Map of "product_type:tier" -> new decimal rate
  const [dirtyRates, setDirtyRates] = useState<Map<string, number>>(new Map());

  // Dirty tracking for rules: Map of "tier" -> { min_commission? }
  const [dirtyRules, setDirtyRules] = useState<Map<string, { min_commission?: number }>>(new Map());

  const [savingRates, setSavingRates] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // Check permission
  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => {
        setIsSuperAdmin(d.role === 'super_admin');
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Load data
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

  // ── Rate change handler ──

  function handleRateChange(productType: string, tier: Tier, newRate: number) {
    const key = `${productType}:${tier}`;
    setDirtyRates((prev) => {
      const next = new Map(prev);
      // Check if it matches the original value
      const original = rates.find((r) => r.product_type === productType);
      const originalRate = original ? original[`${tier}_rate` as keyof RateRow] as number : 0;
      if (Math.abs(newRate - originalRate) < 0.0001) {
        next.delete(key);
      } else {
        next.set(key, newRate);
      }
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
      if (std >= sen) {
        showToast(`${name}: Standard(${(std * 100).toFixed(1)}%) 必须小于 Senior(${(sen * 100).toFixed(1)}%)`, 'error');
        return;
      }
      if (sen >= par) {
        showToast(`${name}: Senior(${(sen * 100).toFixed(1)}%) 必须小于 Partner(${(par * 100).toFixed(1)}%)`, 'error');
        return;
      }
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

      const allOk = results.every((r) => r.ok);
      if (allOk) {
        setRates((prev) =>
          prev.map((row) => {
            const updated = { ...row };
            for (const [key, rate] of entries) {
              const [pt, tier] = key.split(':');
              if (pt === row.product_type) {
                (updated as Record<string, unknown>)[`${tier}_rate`] = rate;
              }
            }
            return updated as RateRow;
          })
        );
        setDirtyRates(new Map());
        showToast('佣金比例已保存', 'success');
      } else {
        const failed = results.find((r) => !r.ok);
        const body = failed ? await failed.json().catch(() => null) : null;
        showToast(body?.error || '部分保存失败，请重试', 'error');
      }
    } catch {
      showToast('保存失败，请重试', 'error');
    }
    setSavingRates(false);
  }

  // ── Rule change handler ──

  function handleRuleCommissionChange(tier: string, value: number) {
    setDirtyRules((prev) => {
      const next = new Map(prev);
      const original = rules.find((r) => r.tier === tier);
      const isClean = original && Math.abs(value - original.min_commission) < 0.01;

      if (isClean) {
        next.delete(tier);
      } else {
        next.set(tier, { min_commission: value });
      }
      return next;
    });
  }

  function getEffectiveRuleCommission(tier: string): number {
    const dirty = dirtyRules.get(tier);
    if (dirty?.min_commission !== undefined) return dirty.min_commission;
    const original = rules.find((r) => r.tier === tier);
    return original?.min_commission ?? 0;
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

      const allOk = results.every((r) => r.ok);
      if (allOk) {
        setRules((prev) =>
          prev.map((row) => {
            const changes = dirtyRules.get(row.tier);
            if (!changes) return row;
            return {
              ...row,
              min_commission: changes.min_commission ?? row.min_commission,
            };
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

  // ── Render ──

  const disabled = !isSuperAdmin;

  return (
    <div className="space-y-5 pb-20">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">等级管理</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          管理 Sales 等级佣金比例和晋级规则
          <span className="text-gray-400 dark:text-gray-500 ml-2">(仅 Super Admin 可编辑)</span>
        </p>
      </div>

      {/* Permission banner */}
      {authChecked && !isSuperAdmin && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>仅 Super Admin 可编辑等级设置</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'rates'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          等级佣金比例
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'rules'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          晋级规则
        </button>
      </div>

      {/* Tab 1: Rates */}
      {activeTab === 'rates' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rates.map((row) => {
                const display = PRODUCT_DISPLAY[row.product_type] || { name: row.product_name || row.product_type, type: '' };
                const price = PRODUCT_PRICES[row.product_type] ?? 0;
                const isSubscription = row.product_type.startsWith('sub_');

                return (
                  <div
                    key={row.product_type}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{display.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{row.product_type}</span>
                          {price > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              ${price.toFixed(2)}
                              {isSubscription && '/月'}
                            </span>
                          )}
                        </div>
                      </div>
                      {display.type && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isSubscription
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {display.type}
                        </span>
                      )}
                    </div>

                    {/* 3 tier columns */}
                    <div className="grid grid-cols-3 gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                      {TIERS.map((tier) => (
                        <RateCell
                          key={tier.key}
                          tier={tier}
                          rate={getEffectiveRate(row.product_type, tier.key)}
                          price={price}
                          disabled={disabled}
                          onChange={(val) => handleRateChange(row.product_type, tier.key, val)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating save button */}
          {dirtyRates.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
              <button
                onClick={saveAllRates}
                disabled={savingRates}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium shadow-lg hover:opacity-90 disabled:opacity-50 transition"
              >
                {savingRates ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <span>保存修改</span>
                    <span className="bg-white/20 dark:bg-gray-900/20 px-2 py-0.5 rounded text-xs">{dirtyRates.size} 项</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Rules */}
      {activeTab === 'rules' && (
        <>
          {loading ? (
            <SkeletonTable />
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">等级</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">累计佣金 &ge;</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">说明</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">当前人数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {/* Standard row */}
                    <tr>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">Standard</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-400 dark:text-gray-500">&mdash;</td>
                      <td className="px-4 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          默认等级
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{counts.standard}</span>
                      </td>
                    </tr>

                    {/* Senior row */}
                    <tr>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="font-medium text-amber-600 dark:text-amber-400">Senior</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={disabled}
                            value={(() => {
                              const dirty = dirtyRules.get('senior');
                              if (dirty?.min_commission !== undefined) {
                                return dirty.min_commission === 0 ? '' : String(dirty.min_commission);
                              }
                              const orig = rules.find((r) => r.tier === 'senior');
                              const v = orig?.min_commission ?? 0;
                              return v === 0 ? '' : String(v);
                            })()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              if (raw === '') { handleRuleCommissionChange('senior', 0); return; }
                              const n = Number(raw);
                              if (!isNaN(n)) handleRuleCommissionChange('senior', n);
                            }}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:border-amber-400 dark:focus:border-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400">累计佣金达标自动晋级</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{counts.senior}</span>
                      </td>
                    </tr>

                    {/* Partner row */}
                    <tr>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <span className="font-medium text-purple-600 dark:text-purple-400">Partner</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={disabled}
                            value={(() => {
                              const dirty = dirtyRules.get('partner');
                              if (dirty?.min_commission !== undefined) {
                                return dirty.min_commission === 0 ? '' : String(dirty.min_commission);
                              }
                              const orig = rules.find((r) => r.tier === 'partner');
                              const v = orig?.min_commission ?? 0;
                              return v === 0 ? '' : String(v);
                            })()}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, '');
                              if (raw === '') { handleRuleCommissionChange('partner', 0); return; }
                              const n = Number(raw);
                              if (!isNaN(n)) handleRuleCommissionChange('partner', n);
                            }}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm outline-none focus:border-purple-400 dark:focus:border-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400">累计佣金达标自动晋级</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{counts.partner}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Save rules button */}
              <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                  onClick={saveAllRules}
                  disabled={dirtyRules.size === 0 || savingRules || disabled}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {savingRules ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>保存中...</span>
                    </>
                  ) : (
                    <span>保存规则</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inline animation keyframe for toast */}
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
