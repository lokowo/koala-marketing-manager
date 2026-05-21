'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { MetricLabel } from '../../../../components/ui/metric-label';
import { METRICS } from '../../../../lib/metrics-glossary';

interface FunnelData {
  visits: number;
  registrations: number;
  trial: number;
  paid: number;
}

interface TrendPoint {
  date: string;
  visits: number;
  registrations: number;
}

interface AgentOption {
  id: string;
  display_name: string;
}

interface ApiResponse {
  funnel: FunnelData;
  trend: TrendPoint[];
  agents: AgentOption[];
}

const STAGES = [
  { key: 'visits' as const, metric: METRICS.funnelVisits, color: '#3B82F6' },
  { key: 'registrations' as const, metric: METRICS.funnelRegistrations, color: '#22C55E' },
  { key: 'trial' as const, metric: METRICS.funnelTrial, color: '#F59E0B' },
  { key: 'paid' as const, metric: METRICS.funnelPaid, color: '#8B5CF6' },
];

function formatRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return ((numerator / denominator) * 100).toFixed(1) + '%';
}

export default function SalesFunnelPage() {
  const [days, setDays] = useState(30);
  const [agentId, setAgentId] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (agentId) params.set('agent_id', agentId);
    fetch(`/api/admin/sales-funnel?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days, agentId]);

  const funnel = data?.funnel ?? { visits: 0, registrations: 0, trial: 0, paid: 0 };
  const maxVal = Math.max(funnel.visits, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">销售漏斗</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">访问 → 注册 → 试用 → 付费 全链路转化</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Agent filter */}
          {data?.agents && data.agents.length > 0 && (
            <select
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">全部销售</option>
              {data.agents.map(a => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          )}
          {/* Time range */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { d: 7, label: '7天' },
              { d: 30, label: '30天' },
              { d: 90, label: '90天' },
            ].map(o => (
              <button
                key={o.d}
                onClick={() => setDays(o.d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  days === o.d ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2" />
                <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="h-[280px] bg-gray-50 dark:bg-gray-700/30 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STAGES.map((stage, i) => {
              const count = funnel[stage.key];
              const prev = i > 0 ? funnel[STAGES[i - 1].key] : 0;
              return (
                <div key={stage.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">
                    <MetricLabel label={stage.metric.label} tooltip={stage.metric.tooltip} />
                  </div>
                  <div className="text-2xl font-medium tabular-nums text-gray-900 dark:text-gray-100">{count.toLocaleString()}</div>
                  {i > 0 && (
                    <div className="text-[11px] mt-1 tabular-nums" style={{ color: stage.color }}>
                      <MetricLabel label={formatRate(count, prev)} tooltip={METRICS.funnelConversionRate.tooltip} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Funnel visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-5">转化漏斗</h3>
            <div className="space-y-3">
              {STAGES.map((stage, i) => {
                const count = funnel[stage.key];
                const widthPct = Math.max((count / maxVal) * 100, 4);
                const prev = i > 0 ? funnel[STAGES[i - 1].key] : 0;
                return (
                  <div key={stage.key}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-12 text-right text-gray-500 dark:text-gray-400 flex-shrink-0">{stage.metric.label}</span>
                      <div className="flex-1 relative">
                        <div
                          className="h-10 rounded-lg flex items-center transition-all duration-300"
                          style={{
                            width: `${widthPct}%`,
                            background: `${stage.color}18`,
                            borderLeft: `4px solid ${stage.color}`,
                          }}
                        >
                          <span className="ml-3 text-sm font-medium tabular-nums" style={{ color: stage.color }}>
                            {count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 w-14 text-right flex-shrink-0 tabular-nums">
                        {i === 0 ? '100%' : formatRate(count, prev)}
                      </span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className="ml-[60px] flex items-center gap-1 my-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-300 dark:text-gray-600">
                          <path d="M6 2 L6 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
                          <path d="M3 7 L6 10 L9 7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        </svg>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                          {formatRate(funnel[STAGES[i + 1].key], count)} 转化
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend chart */}
          {(data?.trend ?? []).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">每日访问 & 注册趋势</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data!.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="visits" fill="#3B82F6" radius={[3, 3, 0, 0]} name="访问" />
                  <Bar dataKey="registrations" fill="#22C55E" radius={[3, 3, 0, 0]} name="注册" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
