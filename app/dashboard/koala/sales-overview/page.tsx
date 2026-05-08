'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

export default function SalesOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [perSales, setPerSales] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/sales-overview').then(r => r.json()).then(d => {
      setSummary(d.summary ?? null);
      setPerSales(d.perSales ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Sales 总览</h1>
        <Link href="/dashboard/koala/kpi" className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 no-underline hover:bg-amber-200 font-medium">
          KPI 设置 →
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: '销售人数', value: summary.totalSalesUsers, icon: '👤' },
            { label: '总客户', value: summary.totalCustomers, icon: '👥' },
            { label: '已转化', value: summary.totalConverted, icon: '🎯' },
            { label: '转化率', value: `${summary.overallConversionRate}%`, icon: '📈' },
            { label: '推广码', value: summary.totalQrcodes, icon: '🔗' },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500">{item.label}</span>
                <span>{item.icon}</span>
              </div>
              <div className="text-xl font-bold text-slate-800">{item.value}</div>
            </div>
          ))}
        </div>
      )}

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
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{s.profile.display_name || s.profile.email}</td>
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
