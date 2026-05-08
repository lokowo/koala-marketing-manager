'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface KPI {
  weekly_new_leads: number;
  weekly_followups: number;
  weekly_conversions: number;
  monthly_revenue_target: number;
}

interface WeekSnapshot {
  week_start: string;
  total_leads: number;
  total_conversions: number;
  sales_count: number;
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

export default function KpiPage() {
  const [kpi, setKpi] = useState<KPI>({ weekly_new_leads: 10, weekly_followups: 20, weekly_conversions: 2, monthly_revenue_target: 5000 });
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
    setEditing(false);
  }

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>;

  const chartData = history.map(h => ({
    week: h.week_start.slice(5),
    leads: h.total_leads,
    conversions: h.total_conversions,
  }));

  const metWeeks = history.filter(h => h.total_conversions >= kpi.weekly_conversions).length;
  const achievementRate = history.length > 0 ? ((metWeeks / history.length) * 100).toFixed(0) : '—';

  const sortedSales = [...perSales].sort((a, b) => {
    if (a.conversionsMet !== b.conversionsMet) return a.conversionsMet ? -1 : 1;
    return b.weeklyConversions - a.weeklyConversions;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">KPI 设置与追踪</h1>

      {/* KPI Targets */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">目标设置</h2>
          <button
            onClick={() => editing ? saveKpi() : setEditing(true)}
            className="text-xs px-4 py-1.5 rounded-lg font-medium transition"
            style={{ background: editing ? '#f59e0b' : '#f1f5f9', color: editing ? '#fff' : '#64748b' }}
          >
            {editing ? '保存' : '编辑'}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'weekly_new_leads' as const, label: '周注册目标', icon: '📥', unit: '个' },
            { key: 'weekly_followups' as const, label: '周跟进目标', icon: '📞', unit: '次' },
            { key: 'weekly_conversions' as const, label: '周转化目标', icon: '🎯', unit: '个' },
            { key: 'monthly_revenue_target' as const, label: '周收入目标', icon: '💰', unit: '$' },
          ].map(item => (
            <div key={item.key} className="rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span>{item.icon}</span>
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
              {editing ? (
                <input
                  type="number"
                  value={kpi[item.key]}
                  onChange={e => setKpi(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                  className="w-full text-2xl font-bold text-slate-800 border-b-2 border-amber-300 focus:outline-none bg-transparent"
                />
              ) : (
                <div className="text-2xl font-bold text-slate-800">{kpi[item.key]} <span className="text-xs font-normal text-slate-400">{item.unit}</span></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">本周达标情况</h2>
        {sortedSales.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">暂无销售数据</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-2.5 font-medium">销售</th>
                  <th className="text-center px-4 py-2.5 font-medium">状态</th>
                  <th className="text-center px-4 py-2.5 font-medium">注册</th>
                  <th className="text-center px-4 py-2.5 font-medium">跟进</th>
                  <th className="text-center px-4 py-2.5 font-medium">转化</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSales.map(s => {
                  const allMet = s.leadsMet && s.followupsMet && s.conversionsMet;
                  const noneMet = !s.leadsMet && !s.followupsMet && !s.conversionsMet;
                  const statusIcon = allMet ? '🌟' : noneMet ? '🔴' : '⚠️';
                  return (
                    <tr key={s.userId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-center text-base">{statusIcon}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-medium ${s.leadsMet ? 'text-green-600' : 'text-red-500'}`}>
                          {s.weeklyLeads}/{s.leadsTarget}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-medium ${s.followupsMet ? 'text-green-600' : 'text-red-500'}`}>
                          {s.weeklyFollowups}/{s.followupsTarget}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-medium ${s.conversionsMet ? 'text-green-600' : 'text-red-500'}`}>
                          {s.weeklyConversions}/{s.conversionsTarget}
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
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">过去 12 周趋势</h2>
          <span className="text-xs text-slate-400">达标率 {achievementRate}%</span>
        </div>
        {chartData.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">暂无历史数据 — 周报将在每周一自动生成</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <ReferenceLine y={kpi.weekly_conversions} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `目标 ${kpi.weekly_conversions}`, position: 'right', fontSize: 10, fill: '#ef4444' }} />
              <Bar dataKey="leads" fill="#93c5fd" radius={[4, 4, 0, 0]} name="线索" />
              <Bar dataKey="conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} name="转化" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
