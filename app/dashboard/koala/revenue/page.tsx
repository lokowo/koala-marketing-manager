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

  if (loading) return (
    <div className="py-12 flex flex-col items-center gap-4">
      <div className="animate-pulse space-y-3 w-full max-w-md">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
      </div>
    </div>
  );

  const mrr = subs?.stats.mrr ?? 0;
  const monthTx = revenue?.thisMonth.transactions ?? 0;
  const monthCredits = revenue?.thisMonth.totalCredits ?? 0;
  const totalActive = subs?.stats.totalActive ?? 0;

  const KPI_CARDS = [
    { label: '本月收入', value: `$${monthCredits.toFixed(2)}`, bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'MRR', value: `$${mrr.toFixed(2)}`, bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: '本月交易', value: monthTx, bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'ARPU', value: totalActive > 0 ? `$${(mrr / totalActive).toFixed(2)}` : '$0.00', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  const tierData = Object.entries(subs?.stats.byTier ?? {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">收入分析</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">收入、订阅与交易数据</p>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map(card => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="mb-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{card.label}</span>
            </div>
            <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">{card.value}</div>
          </div>
        ))}
      </div>

      {/* 2-column: Subscription distribution pie + Revenue summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">订阅分布</h3>
          {tierData.length > 0 ? (
            <div className="flex items-center">
              <div className="w-1/2 rounded-lg bg-gray-50 dark:bg-gray-900/50 p-1">
              <ResponsiveContainer width="100%" height={180}>
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
              </div>
              <div className="flex-1 space-y-2 pl-4">
                {tierData.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400">{t.name}</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t.value}</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">活跃订阅</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{totalActive}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500 dark:text-gray-400">本月新增</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">+{subs?.stats.newThisMonth ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-500 dark:text-gray-400">本月流失</span>
                    <span className="text-red-500 dark:text-red-400 font-medium">-{subs?.stats.canceledThisMonth ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-xs text-gray-400 dark:text-gray-500">暂无订阅数据</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">收入概览</h3>
          <div className="space-y-3">
            {[
              { label: '今日', tx: revenue?.today.transactions ?? 0, credits: revenue?.today.totalCredits ?? 0 },
              { label: '本周', tx: revenue?.thisWeek.transactions ?? 0, credits: revenue?.thisWeek.totalCredits ?? 0 },
              { label: '本月', tx: revenue?.thisMonth.transactions ?? 0, credits: revenue?.thisMonth.totalCredits ?? 0 },
            ].map(period => (
              <div key={period.label} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-600 dark:text-gray-400">{period.label}</span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">${period.credits.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">{period.tx} 笔交易</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">收入明细</h3>
        {(revenue?.recentTransactions ?? []).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400 dark:text-gray-500">暂无交易记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-3 py-2 font-medium">日期</th>
                  <th className="text-left px-3 py-2 font-medium">用户</th>
                  <th className="text-left px-3 py-2 font-medium">描述</th>
                  <th className="text-left px-3 py-2 font-medium">类型</th>
                  <th className="text-right px-3 py-2 font-medium">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {revenue!.recentTransactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{new Date(tx.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono text-[10px]">{tx.user_id.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{tx.description || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        tx.type === 'purchase' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {tx.type === 'purchase' ? '购买' : '订阅'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-200">${tx.amount.toFixed(2)}</td>
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
