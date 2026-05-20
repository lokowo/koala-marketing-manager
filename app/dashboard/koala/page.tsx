'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface DashboardData {
  kpi: {
    total_users: number;
    new_users_month: number;
    new_users_prev_month: number;
    new_users_change: number;
    mau: number;
    mau_prev: number;
    mau_change: number;
    revenue_month: number;
    revenue_prev_month: number;
    revenue_change: number;
    commission_total: number;
  };
  user_trend: { date: string; registrations: number; active: number }[];
  pending_actions: {
    commissions: { count: number; amount: number };
    handoff: number;
    draft_posts: number;
  };
  sales_ranking: { display_name: string; commission: number; registrations: number }[];
  revenue_breakdown: { credits: number; subscriptions: number; total: number };
  recent_activity: { id: string; time: string; actor_name: string; action_type: string; description: string }[];
}

const TREND_RANGES = ['7', '30', '90'] as const;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function ChangeTag({ value }: { value: number }) {
  if (value === 0) return <span className="text-[11px] text-gray-400 dark:text-gray-500">—</span>;
  const positive = value > 0;
  return (
    <span className={`text-[11px] font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

const PIE_COLORS = ['#F59E0B', '#3B82F6', '#94A3B8'];

export default function KoalaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [trendRange, setTrendRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    fetch('/api/admin/dashboard-overview')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  const trendData = data?.user_trend
    ? trendRange === '7'
      ? data.user_trend.slice(-7)
      : trendRange === '90'
      ? data.user_trend
      : data.user_trend
    : [];

  const kpi = data?.kpi;
  const pending = data?.pending_actions;

  const KPI_CARDS = [
    { label: '总用户', value: kpi?.total_users ?? '—', sub: '总注册量', change: null, href: '/dashboard/koala/users' },
    { label: '本月新增', value: kpi?.new_users_month ?? '—', sub: 'vs上月', change: kpi?.new_users_change ?? 0, href: '/dashboard/koala/growth' },
    { label: '月活跃', value: kpi?.mau ?? '—', sub: '活跃对话数', change: kpi?.mau_change ?? 0, href: '/dashboard/koala/analytics' },
    { label: '本月收入', value: `$${(kpi?.revenue_month ?? 0).toFixed(2)}`, sub: 'MRR AUD', change: kpi?.revenue_change ?? 0, href: '/dashboard/koala/revenue' },
    { label: '分销佣金', value: `$${(kpi?.commission_total ?? 0).toFixed(2)}`, sub: '待发+已发', change: null, href: '/dashboard/koala/commission-review' },
  ];

  const pendingItems = [
    { color: 'red', label: `待审核佣金 ${pending?.commissions.count ?? 0}笔`, sub: `$${(pending?.commissions.amount ?? 0).toFixed(2)}`, href: '/dashboard/koala/commission-review', show: (pending?.commissions.count ?? 0) > 0 },
    { color: 'yellow', label: `Handoff 待处理 ${pending?.handoff ?? 0}条`, sub: '', href: '/dashboard/koala/handoff', show: (pending?.handoff ?? 0) > 0 },
    { color: 'green', label: `草稿文章 ${pending?.draft_posts ?? 0}篇`, sub: '', href: '/dashboard/koala/blog', show: (pending?.draft_posts ?? 0) > 0 },
  ];
  const hasPending = pendingItems.some(p => p.show);

  const pieData = data
    ? [
        { name: '积分包', value: data.revenue_breakdown.credits },
        { name: '订阅', value: data.revenue_breakdown.subscriptions },
      ].filter(d => d.value > 0)
    : [];

  const activityColorMap: Record<string, string> = {
    blue: 'bg-blue-400',
    green: 'bg-emerald-400',
    orange: 'bg-amber-400',
    purple: 'bg-purple-400',
    gray: 'bg-slate-300',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">管理总览</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Koala PhD 运营概览</p>
      </div>

      {/* Area A: 5 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {KPI_CARDS.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="no-underline group"
          >
            <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${
              card.change !== null && card.change < -10 ? 'border-t-2 border-t-red-400' : ''
            }`}>
              <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">{card.label}</div>
              <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">{card.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{card.sub}</span>
                {card.change !== null && <ChangeTag value={card.change} />}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Area B: Trend chart + Pending actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">用户趋势</h3>
            <div className="flex gap-1">
              {TREND_RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    trendRange === r ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {r}天
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-2">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="active" stroke="#3B82F6" strokeWidth={2} fill="url(#gradActive)" name="日活跃" />
                <Area type="monotone" dataKey="registrations" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" name="日注册" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-40 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-24 h-3 bg-gray-100 dark:bg-gray-700/50 rounded" />
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">待处理事项</h3>
          {!data ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3 items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700/50 rounded" />
                </div>
              ))}
            </div>
          ) : !hasPending ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无待处理事项</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.filter(p => p.show).map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition no-underline group"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.color === 'red' ? 'bg-red-400' : item.color === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  {item.sub && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.sub}</span>}
                  <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Area C: Sales ranking + Revenue pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">分销团队排行</h3>
            <Link href="/dashboard/koala/sales-overview" className="text-[11px] text-amber-600 dark:text-amber-400 no-underline hover:underline">查看全部 →</Link>
          </div>
          {!data ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3 items-center">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700/50 rounded" />
                </div>
              ))}
            </div>
          ) : data.sales_ranking.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">暂无销售数据</p>
          ) : (
            <div className="space-y-2">
              {data.sales_ranking.map((s, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="w-6 text-center text-sm">
                      {i < 3 ? medals[i] : <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">{i + 1}</span>}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{s.display_name}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">${s.commission.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">收入来源</h3>
          {!data ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="animate-pulse w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-700" />
            </div>
          ) : pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-xs text-gray-400 dark:text-gray-500">暂无收入数据</p>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900/50 p-2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" className="fill-gray-900 dark:fill-gray-100 text-lg font-medium">
                    ${data.revenue_breakdown.total.toFixed(0)}
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
                    总收入
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Area D: Recent activity timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">最近动态</h3>
          <Link href="/dashboard/koala/work-logs" className="text-[11px] text-amber-600 dark:text-amber-400 no-underline hover:underline">查看全部 →</Link>
        </div>
        {!data ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex gap-3 items-start">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-48 h-3.5 bg-gray-100 dark:bg-gray-700/50 rounded" />
                  <div className="w-24 h-3 bg-gray-100 dark:bg-gray-700/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : data.recent_activity.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">暂无动态</p>
        ) : (
          <div className="space-y-0">
            {data.recent_activity.map(item => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${activityColorMap[item.action_type] || 'bg-gray-300 dark:bg-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.actor_name}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{item.description}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap">{timeAgo(item.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Area E: Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '✨', label: 'AI 生成文章', href: '/dashboard/koala/ai-content' },
          { icon: '👤', label: '添加销售', href: '/dashboard/koala/sales-agents' },
          { icon: '📋', label: '新建问卷', href: '/dashboard/koala/surveys/create' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-shadow no-underline"
          >
            <span className="text-xl">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
