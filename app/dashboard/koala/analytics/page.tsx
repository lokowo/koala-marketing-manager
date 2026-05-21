'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

type Tab = 'overview' | 'ai' | 'features';

const FUNNEL_STAGES = [
  { key: 'lead', label: '线索', color: '#94a3b8' },
  { key: 'contacted', label: '已联系', color: '#60a5fa' },
  { key: 'interested', label: '有意向', color: '#34d399' },
  { key: 'trial', label: '试用中', color: '#a78bfa' },
  { key: 'converted', label: '已转化', color: '#f59e0b' },
  { key: 'churned', label: '流失', color: '#ef4444' },
];

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16'];

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${range}`)
      .then(r => r.ok ? r.json() : {})
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">数据分析</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">平台运营数据概览</p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { days: 7, label: '7天' },
            { days: 30, label: '30天' },
            { days: 90, label: '90天' },
          ].map(o => (
            <button
              key={o.days}
              onClick={() => setRange(o.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === o.days ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'overview' as Tab, label: '概览' },
          { key: 'ai' as Tab, label: 'AI 使用' },
          { key: 'features' as Tab, label: '功能使用' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
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
            <div className="h-4 w-28 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-[260px] bg-gray-50 dark:bg-gray-700/30 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Tab 1: Overview */}
          {tab === 'overview' && (
            <>
              {data?.engagementMetrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard label="总用户" value={data.engagementMetrics.totalUsers ?? 0} />
                  <MetricCard label={`${range}天新增`} value={data.engagementMetrics.newUsersInRange ?? 0} accent />
                  <MetricCard label="AI 对话" value={data.engagementMetrics.totalChats ?? 0} />
                  <MetricCard label="套磁信" value={data.engagementMetrics.totalOutreach ?? 0} />
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">用户增长趋势</h3>
                {(data?.userGrowth || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data?.userGrowth}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Area yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCount)" name="日新增" />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="累计用户" strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
                )}
              </div>

              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">日活跃度</h3>
                {(data?.dailyActivity || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data?.dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={25} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="chats" fill="#3b82f6" radius={[3, 3, 0, 0]} name="AI 对话" stackId="a" />
                      <Bar dataKey="outreach" fill="#f59e0b" radius={[3, 3, 0, 0]} name="套磁信" stackId="a" />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
                )}
              </div>
            </>
          )}

          {/* Tab 2: AI Usage */}
          {tab === 'ai' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">AI 模式分布</h3>
                  {(data?.chatModeDistribution || []).length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={data?.chatModeDistribution}
                            dataKey="count"
                            nameKey="mode"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={40}
                            paddingAngle={2}
                          >
                            {data?.chatModeDistribution.map((_: AnyObj, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {data?.chatModeDistribution.map((m: AnyObj, i: number) => (
                          <div key={m.mode} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="text-gray-600 dark:text-gray-400">{m.mode}</span>
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{m.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">日均 AI 对话趋势</h3>
                  {(data?.dailyActivity || []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={data?.dailyActivity}>
                        <defs>
                          <linearGradient id="gradChats" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={25} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        <Area type="monotone" dataKey="chats" stroke="#8B5CF6" strokeWidth={2} fill="url(#gradChats)" name="AI 对话" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tab 3: Feature Usage */}
          {tab === 'features' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Link
                  href="/dashboard/koala/sales-funnel"
                  className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow no-underline group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">销售漏斗</h3>
                    <span className="text-xs text-blue-600 dark:text-blue-400 group-hover:underline">查看详情 →</span>
                  </div>
                  {Object.keys(data?.salesFunnel || {}).length > 0 ? (
                    <div className="space-y-2.5">
                      {(() => {
                        const funnel = data?.salesFunnel ?? {};
                        const total = FUNNEL_STAGES.reduce((s, f) => s + (funnel[f.key] ?? 0), 0) || 1;
                        return FUNNEL_STAGES.map(stage => {
                          const count = funnel[stage.key] ?? 0;
                          const pct = (count / total) * 100;
                          return (
                            <div key={stage.key} className="flex items-center gap-3">
                              <span className="text-[10px] w-14 text-right text-gray-500 dark:text-gray-400">{stage.label}</span>
                              <div className="flex-1 h-7 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50 relative">
                                <div
                                  className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                                  style={{ width: `${Math.max(pct, 6)}%`, background: `${stage.color}25`, borderRight: `3px solid ${stage.color}` }}
                                >
                                  <span className="text-[10px] font-medium" style={{ color: stage.color }}>{count}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 w-10">{pct.toFixed(0)}%</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">点击查看完整销售漏斗分析</p>
                  )}
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    教授大学分布（全部 {(data?.universityDistribution || []).reduce((s: number, g: AnyObj) => s + g.universities.length, 0)} 所）
                  </h3>
                  {(data?.universityDistribution || []).length > 0 ? (
                    <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1">
                      {data!.universityDistribution.map((g: AnyObj) => {
                        const maxCount = Math.max(...g.universities.map((u: AnyObj) => u.count), 1);
                        return (
                          <div key={g.group}>
                            <div className="flex items-center justify-between mb-1.5 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10">
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{g.group}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">小计 {g.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="space-y-1">
                              {g.universities.map((u: AnyObj) => (
                                <div key={u.name} className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-600 dark:text-gray-400 w-16 shrink-0 truncate" title={u.name}>{u.shortName}</span>
                                  <div className="flex-1 h-4 bg-gray-50 dark:bg-gray-700/30 rounded overflow-hidden">
                                    <div
                                      className="h-full rounded bg-blue-500/80 dark:bg-blue-500/60"
                                      style={{ width: `${Math.max((u.count / maxCount) * 100, u.count > 0 ? 2 : 0)}%` }}
                                    />
                                  </div>
                                  <span className={`text-[10px] w-10 text-right tabular-nums ${u.count === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                    {u.count.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">热门教授 (被收藏最多)</h3>
                  {(data?.topProfessors || []).length > 0 ? (
                    <div className="space-y-2">
                      {data!.topProfessors.map((p: AnyObj, i: number) => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-xs text-gray-400 dark:text-gray-500 w-5">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <Link href={`/dashboard/koala/professors/${p.id}`} className="text-sm text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 no-underline">
                              {p.name}
                            </Link>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{p.university}</p>
                          </div>
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{p.savedCount} 收藏</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 dark:text-gray-600 py-8 text-center">暂无数据</p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">博客热门文章</h3>
                  {(data?.topBlogs || []).length > 0 ? (
                    <div className="space-y-2">
                      {data!.topBlogs.map((b: AnyObj, i: number) => (
                        <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-xs text-gray-400 dark:text-gray-500 w-5">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-800 dark:text-gray-200 truncate block">{b.title_zh || 'Untitled'}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{b.category}</span>
                          </div>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{b.view_count ?? 0} 浏览</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 dark:text-gray-600 py-8 text-center">暂无数据</p>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-medium ${accent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{value.toLocaleString()}</div>
    </div>
  );
}
