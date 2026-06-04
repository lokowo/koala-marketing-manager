'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

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

interface KpiOverviewData {
  team_totals: {
    kpi1: KpiValue;
    kpi2: KpiValue;
    kpi3: KpiValue;
    kpi4: KpiValue;
  };
  agents: AgentKpi[];
}

function getKpiColor(pct: number) {
  if (pct >= 100) return '#3B82F6';
  if (pct > 70) return '#22C55E';
  if (pct > 30) return '#F59E0B';
  return '#EF4444';
}

const KPI_META = [
  { key: 'kpi1' as const, num: 'KPI 1', name: '扫码访问', color: '#3B82F6' },
  { key: 'kpi2' as const, num: 'KPI 2', name: '注册', color: '#22C55E' },
  { key: 'kpi3' as const, num: 'KPI 3', name: '付费', color: '#F59E0B' },
  { key: 'kpi4' as const, num: 'KPI 4', name: '线下转化', color: '#8B5CF6' },
];

export default function SalesOverviewPage() {
  const [data, setData] = useState<KpiOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<'kpi1'|'kpi2'|'kpi3'|'kpi4'|'overall'|'revenue'>('overall');

  useEffect(() => {
    fetch('/api/admin/sales-kpi-overview')
      .then(r => { if (!r.ok) throw new Error('加载失败'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message || '加载销售数据失败'); setLoading(false); });
  }, []);

  if (loading) {
    return <p className="text-sm text-[#94A3B8] dark:text-[#64748B] py-12 text-center">加载中...</p>;
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">销售 KPI 总览</h1>
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : (
          <p className="text-sm text-[#94A3B8] dark:text-[#64748B] py-12 text-center">暂无数据</p>
        )}
      </div>
    );
  }

  const { team_totals, agents } = data;

  const sortVal = (a: AgentKpi) => sortKey === 'overall' ? a.overall_pct : sortKey === 'revenue' ? a.revenue : a[sortKey].pct;
  const sortedAgents = [...agents].sort((x, y) => sortVal(y) - sortVal(x));

  const chartData = agents.map(a => ({
    name: a.name,
    'KPI1 扫码': a.kpi1.pct,
    'KPI2 注册': a.kpi2.pct,
    'KPI3 付费': a.kpi3.pct,
    'KPI4 线下': a.kpi4.pct,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">分销总览</h1>
        <Link href="/dashboard/koala/kpi-targets" className="text-xs text-amber-600 no-underline hover:underline">
          KPI 目标设置 →
        </Link>
      </div>

      {/* Team KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_META.map(meta => {
          const kpi = team_totals[meta.key];
          const pctColor = getKpiColor(kpi.pct);
          return (
            <div key={meta.key} className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: meta.color, color: '#fff' }}>
                  {meta.num}
                </span>
                <span className="text-xs text-[#94A3B8] dark:text-[#64748B]">{meta.name}</span>
              </div>
              <div className="text-3xl font-light text-[#111827] dark:text-[#F1F5F9] mt-2 mb-2">
                {kpi.current}
              </div>
              <div className="text-xs text-[#94A3B8] dark:text-[#64748B] mb-2">
                目标 {kpi.target} · 完成 <span className="font-medium" style={{ color: pctColor }}>{kpi.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(kpi.pct, 100)}%`, background: pctColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 前三名领奖台 */}
      {sortedAgents.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map(rankIdx => {
            const a = sortedAgents[rankIdx];
            if (!a) return <div key={rankIdx} />;
            const medalBg = ['#FBBF24', '#CBD5E1', '#F0997B'][rankIdx];
            const medalFg = ['#422006', '#334155', '#4A1B0C'][rankIdx];
            const val = sortKey === 'revenue' ? `A$${a.revenue.toFixed(2)}` : sortKey === 'overall' ? `${a.overall_pct}%` : `${a[sortKey].pct}%`;
            const isFirst = rankIdx === 0;
            return (
              <div key={a.id} className={`bg-white dark:bg-[#1E293B] rounded-2xl border p-4 text-center ${isFirst ? 'border-blue-400/50' : 'border-[#E5E7EB] dark:border-[#334155] mt-3'}`}>
                <div className="size-8 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-sm" style={{ background: medalBg, color: medalFg }}>{rankIdx + 1}</div>
                <div className="text-sm font-medium text-[#111827] dark:text-[#F1F5F9] truncate">{a.name}</div>
                <div className="text-[10px] text-[#94A3B8] dark:text-[#64748B] font-mono mb-1">{a.referral_code}</div>
                <div className="text-base font-semibold text-blue-500">{val}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-Agent KPI Detail Table */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
        <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F1F5F9] px-5 py-4 border-b border-[#E5E7EB] dark:border-[#334155]">
          成员 KPI 明细
        </h2>
        {agents.length === 0 ? (
          <p className="text-xs text-[#94A3B8] dark:text-[#64748B] px-5 py-8 text-center">暂无销售数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#0F172A] text-[#94A3B8] dark:text-[#64748B]">
                  <th className="text-center px-4 py-3 font-medium w-12">名次</th>
                  <th className="text-left px-5 py-3 font-medium">销售</th>
                  <th onClick={() => setSortKey('kpi1')} className={`text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-blue-500 ${sortKey === 'kpi1' ? 'text-blue-500' : ''}`}>KPI 1 扫码{sortKey === 'kpi1' ? ' ↓' : ''}</th>
                  <th onClick={() => setSortKey('kpi2')} className={`text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-blue-500 ${sortKey === 'kpi2' ? 'text-blue-500' : ''}`}>KPI 2 注册{sortKey === 'kpi2' ? ' ↓' : ''}</th>
                  <th onClick={() => setSortKey('kpi3')} className={`text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-blue-500 ${sortKey === 'kpi3' ? 'text-blue-500' : ''}`}>KPI 3 付费{sortKey === 'kpi3' ? ' ↓' : ''}</th>
                  <th onClick={() => setSortKey('kpi4')} className={`text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-blue-500 ${sortKey === 'kpi4' ? 'text-blue-500' : ''}`}>KPI 4 线下{sortKey === 'kpi4' ? ' ↓' : ''}</th>
                  <th onClick={() => setSortKey('overall')} className={`text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-blue-500 ${sortKey === 'overall' ? 'text-blue-500' : ''}`}>总完成率{sortKey === 'overall' ? ' ↓' : ''}</th>
                  <th onClick={() => setSortKey('revenue')} className={`text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-blue-500 ${sortKey === 'revenue' ? 'text-blue-500' : ''}`}>佣金{sortKey === 'revenue' ? ' ↓' : ''}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                {sortedAgents.map((agent, i) => (
                  <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-[#0F172A]/50">
                    <td className="text-center px-4 py-3 w-12">
                      {i < 3 ? (
                        <span className="inline-flex items-center justify-center size-6 rounded-full text-[11px] font-bold" style={{ background: ['#FBBF24', '#CBD5E1', '#F0997B'][i], color: ['#422006', '#334155', '#4A1B0C'][i] }}>
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] dark:text-[#64748B] font-bold">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-gray-100 dark:bg-[#334155] flex items-center justify-center text-[10px] font-bold text-[#94A3B8]">
                          {agent.name[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#111827] dark:text-[#F1F5F9]">{agent.name}</div>
                          <div className="text-[10px] text-[#94A3B8] dark:text-[#64748B] font-mono">{agent.referral_code}</div>
                        </div>
                      </div>
                    </td>
                    {(['kpi1', 'kpi2', 'kpi3', 'kpi4'] as const).map(k => {
                      const kpi = agent[k];
                      return (
                        <td key={k} className="text-center px-4 py-3">
                          <div className="text-[#111827] dark:text-[#F1F5F9]">{kpi.current}/{kpi.target}</div>
                          <div className="text-[10px] font-medium" style={{ color: getKpiColor(kpi.pct) }}>{kpi.pct}%</div>
                        </td>
                      );
                    })}
                    <td className="text-center px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: getKpiColor(agent.overall_pct) }}>
                        {agent.overall_pct}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="text-sm font-medium text-[#111827] dark:text-[#F1F5F9]">A${agent.revenue.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bar Chart: Agent KPI Completion */}
      {agents.length > 0 && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E5E7EB] dark:border-[#334155] p-5">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F1F5F9] mb-4">KPI 完成率对比</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} barCategoryGap="20%" margin={{ bottom: 60 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis domain={[0, 150]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={36} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}%`, undefined]}
                labelFormatter={(label) => String(label)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: '100%', position: 'right', fontSize: 10, fill: '#94a3b8' }} />
              <Bar dataKey="KPI1 扫码" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="KPI2 注册" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="KPI3 付费" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="KPI4 线下" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
