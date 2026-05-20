'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface KPI {
  weekly_new_leads: number;
  weekly_followups: number;
  weekly_conversions: number;
  monthly_revenue_target: number;
}

interface SalesKpi {
  userId: string;
  name: string;
  weeklyLeads: number;
  weeklyFollowups: number;
  weeklyConversions: number;
  leadsTarget: number;
  followupsTarget: number;
  conversionsTarget: number;
  leadsMet: boolean;
  followupsMet: boolean;
  conversionsMet: boolean;
}

interface WeekSnapshot {
  week_start: string;
  total_leads: number;
  total_conversions: number;
  sales_count: number;
}

export default function KpiSettingsPage() {
  const [kpi, setKpi] = useState<KPI>({ weekly_new_leads: 10, weekly_followups: 20, weekly_conversions: 2, monthly_revenue_target: 100 });
  const [history, setHistory] = useState<WeekSnapshot[]>([]);
  const [perSales, setPerSales] = useState<SalesKpi[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/kpi').then(r => r.json()).then(d => {
      if (d.kpi) setKpi(d.kpi);
      setHistory(d.history ?? []);
      setPerSales(d.perSalesKpi ?? []);
      setLoading(false);
    });
  }, []);

  async function saveKpi() {
    await fetch('/api/admin/kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kpi),
    });
    const res = await fetch('/api/admin/kpi');
    const d = await res.json();
    if (d.kpi) setKpi(d.kpi);
    setHistory(d.history ?? []);
    setPerSales(d.perSalesKpi ?? []);
    setEditing(false);
  }

  if (loading) return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中…</p>;

  const sortedSales = [...perSales].sort((a, b) => {
    const aMet = a.leadsMet && a.followupsMet && a.conversionsMet;
    const bMet = b.leadsMet && b.followupsMet && b.conversionsMet;
    if (aMet !== bMet) return aMet ? -1 : 1;
    return b.weeklyConversions - a.weeklyConversions;
  });

  const chartData = history.map(h => ({
    week: h.week_start.slice(5),
    leads: h.total_leads,
    conversions: h.total_conversions,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">Sales KPI 管理</h1>

      {/* KPI Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">📊 Sales KPI 设置</h2>
          <button
            onClick={() => editing ? saveKpi() : setEditing(true)}
            className="text-xs px-4 py-1.5 rounded-lg font-medium transition"
            style={{ background: editing ? '#f59e0b' : '#f1f5f9', color: editing ? '#fff' : '#64748b' }}
          >
            {editing ? '保存设置' : '编辑'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'weekly_new_leads' as const, label: '每周新增注册目标', icon: '📥', unit: '个' },
            { key: 'weekly_followups' as const, label: '每周客户跟进目标', icon: '📞', unit: '次' },
            { key: 'weekly_conversions' as const, label: '每周转化目标', icon: '🎯', unit: '个' },
            { key: 'monthly_revenue_target' as const, label: '每周收入目标', icon: '💰', unit: '$' },
          ].map(item => (
            <div key={item.key} className="rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span>{item.icon}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
              {editing ? (
                <input
                  type="number"
                  value={kpi[item.key]}
                  onChange={e => setKpi(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                  className="w-full text-2xl font-bold text-gray-800 dark:text-gray-200 border-b-2 border-amber-300 focus:outline-none bg-transparent"
                />
              ) : (
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {item.unit === '$' ? `$${kpi[item.key]}` : kpi[item.key]}
                  {item.unit !== '$' && <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">{item.unit}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">自动生成周报：</span>
          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">每周一 ✅</span>
        </div>
      </div>

      {/* Achievement Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">本周 Sales KPI 达标情况</h2>
        {sortedSales.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">暂无销售数据</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-3 py-2.5 font-medium">Sales</th>
                  <th className="text-center px-2 py-2.5 font-medium">注册目标</th>
                  <th className="text-center px-2 py-2.5 font-medium">实际</th>
                  <th className="text-center px-2 py-2.5 font-medium">达标</th>
                  <th className="text-center px-2 py-2.5 font-medium">跟进目标</th>
                  <th className="text-center px-2 py-2.5 font-medium">实际</th>
                  <th className="text-center px-2 py-2.5 font-medium">达标</th>
                  <th className="text-center px-2 py-2.5 font-medium">收入目标</th>
                  <th className="text-center px-2 py-2.5 font-medium">实际</th>
                  <th className="text-center px-2 py-2.5 font-medium">达标</th>
                  <th className="text-center px-2 py-2.5 font-medium">综合</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedSales.map(s => {
                  const allMet = s.leadsMet && s.followupsMet && s.conversionsMet;
                  const noneMet = !s.leadsMet && !s.followupsMet && !s.conversionsMet;
                  return (
                    <tr key={s.userId} className={allMet ? 'bg-green-50/50' : noneMet ? 'bg-red-50/30' : ''}>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-medium">{s.name}</td>
                      <td className="text-center px-2 py-2.5 text-gray-400 dark:text-gray-500">{s.leadsTarget}</td>
                      <td className="text-center px-2 py-2.5 text-gray-700 dark:text-gray-300 font-medium">{s.weeklyLeads}</td>
                      <td className="text-center px-2 py-2.5">{s.leadsMet ? '✅' : '❌'}</td>
                      <td className="text-center px-2 py-2.5 text-gray-400 dark:text-gray-500">{s.followupsTarget}</td>
                      <td className="text-center px-2 py-2.5 text-gray-700 dark:text-gray-300 font-medium">{s.weeklyFollowups}</td>
                      <td className="text-center px-2 py-2.5">{s.followupsMet ? '✅' : '❌'}</td>
                      <td className="text-center px-2 py-2.5 text-gray-400 dark:text-gray-500">${kpi.monthly_revenue_target}</td>
                      <td className="text-center px-2 py-2.5 text-gray-700 dark:text-gray-300 font-medium">$0</td>
                      <td className="text-center px-2 py-2.5">{s.conversionsMet ? '✅' : '❌'}</td>
                      <td className="text-center px-2 py-2.5 text-base">
                        {allMet ? '🌟' : noneMet ? '🔴' : '⚠️'}
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">
                          {allMet ? '全达标' : noneMet ? '未达标' : '部分'}
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

      {/* Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">历史 KPI 趋势（过去 12 周）</h2>
        {chartData.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-8 text-center">暂无历史数据 — 周报将在每周一自动生成</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <ReferenceLine y={kpi.weekly_new_leads} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: `注册目标 ${kpi.weekly_new_leads}`, position: 'right', fontSize: 10, fill: '#3b82f6' }} />
              <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="注册" />
              <Line type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="转化" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
