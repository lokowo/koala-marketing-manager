'use client';

import { useEffect, useState } from 'react';
import { MetricLabel } from '../../../../components/ui/metric-label';
import { METRICS } from '../../../../lib/metrics-glossary';

interface KpiValue {
  current: number;
  target: number;
  pct: number;
}

interface KpiData {
  agent: { id: string; display_name: string; tier: string; referral_code: string };
  period: string;
  has_targets: boolean;
  kpis: {
    visits: KpiValue;
    registrations: KpiValue;
    payments: KpiValue;
    offline: KpiValue;
    revenue: { current: number; target: number };
  };
  overall_pct: number;
}

const KPI_META: { key: 'visits' | 'registrations' | 'payments' | 'offline'; metricKey: keyof typeof METRICS; icon: string }[] = [
  { key: 'visits', metricKey: 'kpiVisits', icon: '📱' },
  { key: 'registrations', metricKey: 'kpiRegistrations', icon: '📝' },
  { key: 'payments', metricKey: 'kpiPayments', icon: '💳' },
  { key: 'offline', metricKey: 'kpiOffline', icon: '🤝' },
];

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

function progressTextColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-500';
  return 'text-red-500';
}

const TIER_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  standard: { label: 'Standard', color: '#64748B', bg: '#F1F5F9' },
  senior:   { label: 'Senior', color: '#B45309', bg: '#FEF3C7' },
  partner:  { label: 'Partner', color: '#7C3AED', bg: '#EDE9FE' },
};

export default function MyKpiPage() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sales/my-kpi')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中...</p>;
  if (!data) return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">无法加载 KPI 数据</p>;

  const { agent, period, has_targets, kpis, overall_pct } = data;
  const tier = TIER_LABEL[agent.tier] || TIER_LABEL.standard;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">我的 KPI</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {period} · {agent.display_name}
          <span
            className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium inline-block"
            style={{ color: tier.color, background: tier.bg }}
          >
            {tier.label}
          </span>
        </p>
      </div>

      {!has_targets && (
        <div className="rounded-xl p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            管理员尚未设置本月 KPI 目标，以下数据仅显示当前实际值。
          </p>
        </div>
      )}

      {/* Overall progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <MetricLabel label={METRICS.kpiOverall.label} tooltip={METRICS.kpiOverall.tooltip} />
          <span className={`text-2xl font-light ${progressTextColor(overall_pct)}`}>
            {has_targets ? `${overall_pct}%` : '—'}
          </span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor(overall_pct)}`}
            style={{ width: has_targets ? `${Math.min(overall_pct, 100)}%` : '0%' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          <span>0%</span>
          <span className="text-amber-500">50%</span>
          <span className="text-emerald-500">80%</span>
          <span>100%</span>
        </div>
      </div>

      {/* KPI cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {KPI_META.map(m => {
          const v = kpis[m.key];
          const metric = METRICS[m.metricKey];
          return (
            <div key={m.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{m.icon}</span>
                <MetricLabel label={metric.label} tooltip={metric.tooltip} />
              </div>

              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-light text-gray-900 dark:text-gray-100">{v.current}</span>
                  {has_targets && v.target > 0 && (
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/ {v.target}</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${has_targets && v.target > 0 ? progressTextColor(v.pct) : 'text-gray-400 dark:text-gray-500'}`}>
                  {has_targets && v.target > 0 ? `${v.pct}%` : '—'}
                </span>
              </div>

              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${has_targets && v.target > 0 ? progressColor(v.pct) : 'bg-gray-300 dark:bg-gray-600'}`}
                  style={{ width: has_targets && v.target > 0 ? `${Math.min(v.pct, 100)}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">💰</span>
          <MetricLabel label={METRICS.kpiRevenue.label} tooltip={METRICS.kpiRevenue.tooltip} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-light text-gray-900 dark:text-gray-100">
              ${kpis.revenue.current.toFixed(2)}
            </span>
            {has_targets && kpis.revenue.target > 0 && (
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">
                / ${kpis.revenue.target}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          进度条颜色: <span className="text-red-500">红色 &lt;50%</span> · <span className="text-amber-500">黄色 50-80%</span> · <span className="text-emerald-500">绿色 &gt;80%</span>。
          权重: KPI1 扫码 15% · KPI2 注册 25% · KPI3 付费 35% · KPI4 线下 25%。
        </p>
      </div>
    </div>
  );
}
