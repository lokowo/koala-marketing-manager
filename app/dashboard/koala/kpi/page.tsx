'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MetricLabel } from '../../../../components/ui/metric-label';
import { METRICS } from '../../../../lib/metrics-glossary';

interface KpiValue {
  current: number;
  target: number;
  pct: number;
}

interface AgentKpi {
  id: string;
  name: string;
  referral_code: string;
  kpi1: KpiValue;
  kpi2: KpiValue;
  kpi3: KpiValue;
  kpi4: KpiValue;
  revenue: number;
  overall_pct: number;
}

interface KpiData {
  team_totals: { kpi1: KpiValue; kpi2: KpiValue; kpi3: KpiValue; kpi4: KpiValue };
  agents: AgentKpi[];
}

function pctColor(pct: number) {
  if (pct >= 100) return 'text-blue-600';
  if (pct > 70) return 'text-emerald-600';
  if (pct > 30) return 'text-amber-500';
  return 'text-red-500';
}

function pctBg(pct: number) {
  if (pct >= 100) return 'bg-blue-500';
  if (pct > 70) return 'bg-emerald-500';
  if (pct > 30) return 'bg-amber-400';
  return 'bg-red-400';
}

const KPI_META = [
  { key: 'kpi1' as const, label: '扫码访问', color: '#3B82F6', icon: '📱', metricKey: 'kpiVisits' as keyof typeof METRICS },
  { key: 'kpi2' as const, label: '注册', color: '#22C55E', icon: '📝', metricKey: 'kpiRegistrations' as keyof typeof METRICS },
  { key: 'kpi3' as const, label: '付费转化', color: '#F59E0B', icon: '💳', metricKey: 'kpiPayments' as keyof typeof METRICS },
  { key: 'kpi4' as const, label: '线下转化', color: '#8B5CF6', icon: '🤝', metricKey: 'kpiOffline' as keyof typeof METRICS },
];

export default function KpiPage() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/sales-kpi-overview')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中...</p>;

  const team = data?.team_totals;
  const agents = data?.agents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">Sales KPI 追踪</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">本月分销团队 KPI 完成情况</p>
        </div>
        <Link
          href="/dashboard/koala/kpi-targets"
          className="text-xs px-4 py-2 rounded-lg bg-[#111827] text-white font-medium hover:opacity-90 transition no-underline"
        >
          设置目标
        </Link>
      </div>

      {/* Team KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_META.map(m => {
          const v = team?.[m.key];
          const pct = v?.pct ?? 0;
          return (
            <div key={m.key} className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>{m.icon}</span>
                <MetricLabel label={METRICS[m.metricKey].label} tooltip={METRICS[m.metricKey].tooltip} />
              </div>
              <div className="text-2xl font-light text-gray-900 dark:text-gray-100">{v?.current ?? 0}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">目标 {v?.target ?? 0}</span>
                <span className={`text-[11px] font-medium ${pctColor(pct)}`}>{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pctBg(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-Agent KPI Table */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">个人达标情况</h2>
        {agents.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">暂无活跃销售人员</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-2.5 font-medium">销售</th>
                  <th className="text-center px-4 py-2.5 font-medium">KPI1 扫码</th>
                  <th className="text-center px-4 py-2.5 font-medium">KPI2 注册</th>
                  <th className="text-center px-4 py-2.5 font-medium">KPI3 付费</th>
                  <th className="text-center px-4 py-2.5 font-medium">KPI4 线下</th>
                  <th className="text-center px-4 py-2.5 font-medium">佣金</th>
                  <th className="text-center px-4 py-2.5 font-medium">总完成率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {agents.map(a => {
                  const allMet = a.kpi1.pct >= 100 && a.kpi2.pct >= 100 && a.kpi3.pct >= 100 && a.kpi4.pct >= 100;
                  const noneMet = a.kpi1.pct === 0 && a.kpi2.pct === 0 && a.kpi3.pct === 0 && a.kpi4.pct === 0;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                            {a.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-700 dark:text-gray-300">{a.name}</div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{a.referral_code}</div>
                          </div>
                        </div>
                      </td>
                      {([a.kpi1, a.kpi2, a.kpi3, a.kpi4] as KpiValue[]).map((kpi, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{kpi.current}/{kpi.target}</span>
                          <div className={`text-[10px] font-medium ${pctColor(kpi.pct)}`}>
                            {kpi.target > 0 ? `${kpi.pct}%` : '—'}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                        ${a.revenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${pctColor(a.overall_pct)}`}>
                          {allMet ? '🌟' : noneMet ? '🔴' : '⚠️'} {a.overall_pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weight explanation */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          总完成率权重: KPI1 扫码 15% · KPI2 注册 25% · KPI3 付费 35% · KPI4 线下 25%。
          目标值在 <Link href="/dashboard/koala/kpi-targets" className="text-amber-600 dark:text-amber-400 hover:underline no-underline">KPI 目标设置</Link> 中按月配置。
        </p>
      </div>
    </div>
  );
}
