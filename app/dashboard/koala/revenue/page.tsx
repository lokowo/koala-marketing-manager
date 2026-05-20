'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface RevenueData {
  today: { transactions: number; totalCredits: number };
  thisWeek: { transactions: number; totalCredits: number };
  thisMonth: { transactions: number; totalCredits: number };
  recentTransactions: { amount: number; description: string; created_at: string; type: string; user_id: string }[];
}

interface SubData {
  stats: { totalActive: number; byTier: Record<string, number>; mrr: number; newThisMonth: number; canceledThisMonth: number };
  subscribers: { user_id: string; tier: string; status: string; email: string; display_name: string; created_at: string }[];
}

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [subs, setSubs] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/revenue').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/subscribers').then(r => r.ok ? r.json() : null),
    ]).then(([rev, sub]) => {
      setRevenue(rev);
      setSubs(sub);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-400 py-12 text-center">加载中...</div>;

  const mrr = subs?.stats.mrr ?? 0;
  const monthTx = revenue?.thisMonth.transactions ?? 0;
  const monthCredits = revenue?.thisMonth.totalCredits ?? 0;
  const totalActive = subs?.stats.totalActive ?? 0;

  const KPI_CARDS = [
    { label: '本月收入', value: `$${monthCredits.toFixed(2)}`, icon: '💰', bg: 'bg-amber-50' },
    { label: 'MRR', value: `$${mrr.toFixed(2)}`, icon: '📈', bg: 'bg-blue-50' },
    { label: '本月交易', value: monthTx, icon: '🧾', bg: 'bg-green-50' },
    { label: 'ARPU', value: totalActive > 0 ? `$${(mrr / totalActive).toFixed(2)}` : '$0.00', icon: '👤', bg: 'bg-purple-50' },
  ];

  const tierData = Object.entries(subs?.stats.byTier ?? {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">收入分析</h1>
        <p className="text-sm text-slate-500 mt-1">收入、订阅与交易数据</p>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-slate-200`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-xl font-bold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      {/* 2-column: Subscription distribution pie + Revenue summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">订阅分布</h3>
          {tierData.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={tierData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {tierData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {tierData.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600">{t.name}</span>
                    </div>
                    <span className="font-medium text-slate-700">{t.value}</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">活跃订阅</span>
                    <span className="font-bold text-slate-800">{totalActive}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">本月新增</span>
                    <span className="text-green-600 font-medium">+{subs?.stats.newThisMonth ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">本月流失</span>
                    <span className="text-red-500 font-medium">-{subs?.stats.canceledThisMonth ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-xs text-slate-400">暂无订阅数据</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">收入概览</h3>
          <div className="space-y-3">
            {[
              { label: '今日', tx: revenue?.today.transactions ?? 0, credits: revenue?.today.totalCredits ?? 0 },
              { label: '本周', tx: revenue?.thisWeek.transactions ?? 0, credits: revenue?.thisWeek.totalCredits ?? 0 },
              { label: '本月', tx: revenue?.thisMonth.transactions ?? 0, credits: revenue?.thisMonth.totalCredits ?? 0 },
            ].map(period => (
              <div key={period.label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{period.label}</span>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">${period.credits.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">{period.tx} 笔交易</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">收入明细</h3>
        {(revenue?.recentTransactions ?? []).length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-xs">暂无交易记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-3 py-2 font-medium">日期</th>
                  <th className="text-left px-3 py-2 font-medium">用户</th>
                  <th className="text-left px-3 py-2 font-medium">描述</th>
                  <th className="text-left px-3 py-2 font-medium">类型</th>
                  <th className="text-right px-3 py-2 font-medium">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {revenue!.recentTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">{new Date(tx.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">{tx.user_id.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-slate-700">{tx.description || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        tx.type === 'purchase' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {tx.type === 'purchase' ? '购买' : '订阅'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">${tx.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
