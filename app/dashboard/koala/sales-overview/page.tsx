'use client';

import { useEffect, useState } from 'react';

interface SalesUser {
  userId: string;
  profile: { display_name: string; email: string; avatar_url: string | null };
  totalCustomers: number;
  converted: number;
  conversionRate: string;
  qrcodeCount: number;
  totalScans: number;
}

interface Summary {
  totalSalesUsers: number;
  totalCustomers: number;
  totalConverted: number;
  overallConversionRate: string;
  totalQrcodes: number;
}

interface KPI {
  weekly_new_leads: number;
  weekly_conversions: number;
  monthly_revenue_target: number;
}

export default function SalesOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [perSales, setPerSales] = useState<SalesUser[]>([]);
  const [kpi, setKpi] = useState<KPI>({ weekly_new_leads: 10, weekly_conversions: 2, monthly_revenue_target: 5000 });
  const [editingKpi, setEditingKpi] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/sales-overview').then(r => r.json()),
      fetch('/api/admin/kpi').then(r => r.json()),
    ]).then(([overview, kpiData]) => {
      setSummary(overview.summary ?? null);
      setPerSales(overview.perSales ?? []);
      if (kpiData.kpi) setKpi(kpiData.kpi);
      setLoading(false);
    });
  }, []);

  async function saveKpi() {
    await fetch('/api/admin/kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kpi),
    });
    setEditingKpi(false);
  }

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">Sales 总览</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: '销售人数', value: summary.totalSalesUsers },
            { label: '总客户', value: summary.totalCustomers },
            { label: '已转化', value: summary.totalConverted },
            { label: '转化率', value: `${summary.overallConversionRate}%` },
            { label: '推广码', value: summary.totalQrcodes },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl p-4 border border-slate-200 text-center">
              <div className="text-lg font-bold text-slate-800">{item.value}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Settings */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">KPI 目标</h2>
          <button
            onClick={() => editingKpi ? saveKpi() : setEditingKpi(true)}
            className="text-xs px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            {editingKpi ? '保存' : '编辑'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'weekly_new_leads' as const, label: '周新增线索' },
            { key: 'weekly_conversions' as const, label: '周转化数' },
            { key: 'monthly_revenue_target' as const, label: '月收入目标 ($)' },
          ].map(item => (
            <div key={item.key}>
              <label className="text-[10px] text-slate-500 mb-1 block">{item.label}</label>
              {editingKpi ? (
                <input
                  type="number"
                  value={kpi[item.key]}
                  onChange={e => setKpi(prev => ({ ...prev, [item.key]: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg px-2 py-1.5 text-xs border border-slate-200 focus:outline-none"
                />
              ) : (
                <div className="text-sm font-semibold text-slate-800">{kpi[item.key]}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Per-sales breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <h2 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-100">各销售数据</h2>
        {perSales.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-6 text-center">暂无销售数据</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-left px-4 py-2 font-medium">销售</th>
                <th className="text-center px-4 py-2 font-medium">客户</th>
                <th className="text-center px-4 py-2 font-medium">转化</th>
                <th className="text-center px-4 py-2 font-medium">转化率</th>
                <th className="text-center px-4 py-2 font-medium">推广码</th>
                <th className="text-center px-4 py-2 font-medium">扫描</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perSales.map(s => (
                <tr key={s.userId} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">{s.profile.display_name || s.profile.email}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{s.totalCustomers}</td>
                  <td className="px-4 py-2.5 text-center text-green-600 font-medium">{s.converted}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{s.conversionRate}%</td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{s.qrcodeCount}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{s.totalScans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
