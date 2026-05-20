'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface SalesUser {
  userId: string;
  profile: { display_name: string; email: string; avatar_url: string | null };
  totalCustomers: number;
  converted: number;
  conversionRate: string;
  qrcodeCount: number;
  totalScans: number;
}

interface DistributionData {
  teamTotals: { visits: number; registrations: number; conversions: number; commission: number };
  agentRankings: { agentId: string; name: string; visits: number; registrations: number; conversions: number; commission: number }[];
  channelBreakdown: { channel: string; visits: number; registrations: number }[];
}

interface EngagementEntry { userId: string; displayName: string; email: string; totalScore: number; level: 'high' | 'medium' | 'low' | 'dormant'; breakdown: { chatActivity: number; professorEngagement: number; profileCompleteness: number; outreachActivity: number; recency: number }; stats: { conversationCount: number; savedProfessors: number; emailsGenerated: number; profilePct: number; daysSinceLastActive: number; registeredDaysAgo: number } }
interface EngagementSummary { high: number; medium: number; low: number; dormant: number; total: number; avgScore: number }

interface KPI { weekly_new_leads: number; weekly_followups: number; weekly_conversions: number; monthly_revenue_target: number }
interface WeekSnapshot { week_start: string; total_leads: number; total_conversions: number; sales_count: number }
interface SalesKpi { userId: string; name: string; weeklyLeads: number; weeklyFollowups: number; weeklyConversions: number; weeklyContacts: number; contactMethodBreakdown: Record<string, number>; totalCustomers: number; totalConverted: number; conversionRate: string; leadsTarget: number; followupsTarget: number; conversionsTarget: number; leadsMet: boolean; followupsMet: boolean; conversionsMet: boolean }

type Tab = 'team' | 'kpi';

const CH_LABELS: Record<string, string> = {
  wechat: '微信', xiaohongshu: '小红书', douyin: '抖音', weibo: '微博',
  zhihu: '知乎', bilibili: 'Bilibili', email: '邮件', whatsapp: 'WhatsApp',
  offline: '线下', survey: '调研', other: '其他', unknown: '未知',
};

const LEVEL_CONFIG = {
  high: { emoji: '🔥', label: '高活跃', color: '#16a34a', bg: '#dcfce7' },
  medium: { emoji: '🟡', label: '中等', color: '#ca8a04', bg: '#fef9c3' },
  low: { emoji: '🔵', label: '低活跃', color: '#2563eb', bg: '#dbeafe' },
  dormant: { emoji: '⚪', label: '沉默', color: '#6b7280', bg: '#f3f4f6' },
};

export default function SalesOverviewPage() {
  const [tab, setTab] = useState<Tab>('team');
  const [perSales, setPerSales] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSales, setSelectedSales] = useState<string | null>(null);
  const [engData, setEngData] = useState<EngagementEntry[]>([]);
  const [engSummary, setEngSummary] = useState<EngagementSummary | null>(null);
  const [engLoading, setEngLoading] = useState(false);
  const [dist, setDist] = useState<DistributionData | null>(null);

  const [kpi, setKpi] = useState<KPI>({ weekly_new_leads: 10, weekly_followups: 20, weekly_conversions: 2, monthly_revenue_target: 5000 });
  const [kpiHistory, setKpiHistory] = useState<WeekSnapshot[]>([]);
  const [kpiPerSales, setKpiPerSales] = useState<SalesKpi[]>([]);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/sales-overview').then(r => r.json()).then(d => {
      setPerSales(d.perSales ?? []);
      setDist(d.distribution ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    fetch('/api/admin/kpi').then(r => r.json()).then(d => {
      if (d.kpi) setKpi(d.kpi);
      setKpiHistory(d.history ?? []);
      setKpiPerSales(d.perSalesKpi ?? []);
      setKpiLoading(false);
    }).catch(() => setKpiLoading(false));
  }, []);

  async function loadEngagement(salesUserId: string) {
    if (selectedSales === salesUserId) { setSelectedSales(null); return; }
    setSelectedSales(salesUserId);
    setEngLoading(true);
    try {
      const res = await fetch(`/api/sales/customer-engagement?salesUserId=${salesUserId}`);
      const data = await res.json();
      setEngData(data.data ?? []);
      setEngSummary(data.summary ?? null);
    } catch { setEngData([]); setEngSummary(null); }
    setEngLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">分销总览</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'team' as Tab, label: '团队总览' },
          { key: 'kpi' as Tab, label: 'Sales KPI' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Team Overview */}
      {tab === 'team' && (
        <>
          {loading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中…</p>
          ) : (
            <>
              {/* 4 KPI cards */}
              {dist && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: '团队总佣金', value: `$${dist.teamTotals.commission.toFixed(2)}`, icon: '💰' },
                    { label: '总注册', value: dist.teamTotals.registrations, icon: '📥' },
                    { label: '总访问', value: dist.teamTotals.visits, icon: '👁' },
                    { label: '平均转化率', value: `${dist.teamTotals.registrations > 0 ? ((dist.teamTotals.conversions / dist.teamTotals.registrations) * 100).toFixed(1) : '0'}%`, icon: '📈' },
                  ].map(item => (
                    <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
                        <span>{item.icon}</span>
                      </div>
                      <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2-column: Rankings + Channel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {dist && dist.agentRankings.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">成员业绩对比</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                            <th className="text-center px-3 py-2 font-medium w-8">#</th>
                            <th className="text-left px-3 py-2 font-medium">销售</th>
                            <th className="text-center px-3 py-2 font-medium">注册</th>
                            <th className="text-center px-3 py-2 font-medium">转化</th>
                            <th className="text-center px-3 py-2 font-medium">佣金</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {dist.agentRankings.map((a, i) => (
                            <tr key={a.agentId} className={i === 0 ? 'bg-amber-50/50' : 'hover:bg-gray-50 dark:bg-gray-800/50'}>
                              <td className="text-center px-3 py-2.5 font-bold text-amber-600">{i + 1}</td>
                              <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-300">{a.name}</td>
                              <td className="text-center px-3 py-2.5 text-gray-600 dark:text-gray-400">{a.registrations}</td>
                              <td className="text-center px-3 py-2.5 text-gray-600 dark:text-gray-400">{a.conversions}</td>
                              <td className="text-center px-3 py-2.5 font-bold text-amber-600">${a.commission.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {dist && dist.channelBreakdown.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">渠道效率排名</h2>
                    <div className="space-y-2">
                      {dist.channelBreakdown.sort((a, b) => b.visits - a.visits).map(ch => (
                        <div key={ch.channel} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-16">{CH_LABELS[ch.channel] || ch.channel}</span>
                          <div className="flex-1 h-4 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div className="h-full rounded bg-blue-200" style={{ width: `${(ch.visits / Math.max(...dist.channelBreakdown.map(c => c.visits), 1)) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 w-20 text-right">访问{ch.visits} 注册{ch.registrations}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Per-sales table */}
              <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  汇总表 <span className="font-normal text-gray-400 dark:text-gray-500">（点击查看客户活跃度）</span>
                </h2>
                {perSales.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-4 py-6 text-center">暂无销售数据</p>
                ) : (
                  <>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                          <th className="text-left px-4 py-2 font-medium">销售</th>
                          <th className="text-center px-4 py-2 font-medium">客户</th>
                          <th className="text-center px-4 py-2 font-medium">转化</th>
                          <th className="text-center px-4 py-2 font-medium">转化率</th>
                          <th className="text-center px-4 py-2 font-medium">推广码</th>
                          <th className="text-center px-4 py-2 font-medium">扫描</th>
                          <th className="text-center px-4 py-2 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {perSales.map(s => (
                          <tr
                            key={s.userId}
                            className={`hover:bg-gray-50 dark:bg-gray-800/50 cursor-pointer ${selectedSales === s.userId ? 'bg-amber-50' : ''}`}
                            onClick={() => loadEngagement(s.userId)}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                  {(s.profile.display_name || s.profile.email || '?')[0].toUpperCase()}
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{s.profile.display_name || s.profile.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.totalCustomers}</td>
                            <td className="px-4 py-2.5 text-center text-green-600 font-medium">{s.converted}</td>
                            <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.conversionRate}%</td>
                            <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.qrcodeCount}</td>
                            <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{s.totalScans}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="text-xs text-amber-600">{selectedSales === s.userId ? '▲' : '▶'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Engagement Drill-down */}
                    {selectedSales && (
                      <div className="border-t-2 border-amber-200 px-4 py-4 bg-amber-50/50">
                        {engLoading ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">加载客户活跃度…</p>
                        ) : (
                          <>
                            {engSummary && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                <span className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                  📊 平均分 <strong>{engSummary.avgScore}</strong>
                                </span>
                                {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
                                  <span key={key} className="text-xs px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                                    {cfg.emoji} {cfg.label} <strong>{engSummary[key as keyof typeof LEVEL_CONFIG]}</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                            {engData.length === 0 ? (
                              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">该销售暂无客户数据</p>
                            ) : (
                              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                                {engData.map(e => {
                                  const cfg = LEVEL_CONFIG[e.level];
                                  return (
                                    <div key={e.userId} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                                      <div className="size-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                                        {e.totalScore}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{e.displayName || e.email || '未知'}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                                            {cfg.emoji} {cfg.label}
                                          </span>
                                        </div>
                                        <div className="flex gap-3 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                          <span>💬 {e.stats.conversationCount}</span>
                                          <span>📌 {e.stats.savedProfessors}</span>
                                          <span>✉️ {e.stats.emailsGenerated}</span>
                                          <span>📝 {e.stats.profilePct}%</span>
                                        </div>
                                      </div>
                                      <div className="flex-shrink-0 w-24 space-y-0.5">
                                        {[
                                          { label: '聊天', val: e.breakdown.chatActivity, max: 30 },
                                          { label: '教授', val: e.breakdown.professorEngagement, max: 25 },
                                          { label: '套磁', val: e.breakdown.outreachActivity, max: 20 },
                                        ].map(bar => (
                                          <div key={bar.label} className="flex items-center gap-1">
                                            <span className="text-[8px] text-gray-400 dark:text-gray-500 w-5">{bar.label}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                                              <div className="h-full rounded-full" style={{ width: `${(bar.val / bar.max) * 100}%`, background: cfg.color }} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex-shrink-0 text-[10px] w-14 text-right">
                                        {e.stats.daysSinceLastActive <= 3 ? (
                                          <span className="text-green-600">● 活跃</span>
                                        ) : e.stats.daysSinceLastActive <= 14 ? (
                                          <span className="text-amber-600">● {e.stats.daysSinceLastActive}天</span>
                                        ) : (
                                          <span className="text-red-400">● {e.stats.daysSinceLastActive}天</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Tab 2: Sales KPI */}
      {tab === 'kpi' && (
        <>
          {kpiLoading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中…</p>
          ) : (
            <>
              {/* KPI achievement table */}
              <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">本周达标情况</h2>
                {kpiPerSales.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">暂无销售数据</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                          <th className="text-left px-4 py-2.5 font-medium">销售</th>
                          <th className="text-center px-4 py-2.5 font-medium">状态</th>
                          <th className="text-center px-4 py-2.5 font-medium">注册</th>
                          <th className="text-center px-4 py-2.5 font-medium">联系</th>
                          <th className="text-center px-4 py-2.5 font-medium">跟进</th>
                          <th className="text-center px-4 py-2.5 font-medium">转化</th>
                          <th className="text-center px-4 py-2.5 font-medium">总转化率</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {[...kpiPerSales].sort((a, b) => {
                          if (a.conversionsMet !== b.conversionsMet) return a.conversionsMet ? -1 : 1;
                          return b.weeklyConversions - a.weeklyConversions;
                        }).map(s => {
                          const allMet = s.leadsMet && s.followupsMet && s.conversionsMet;
                          const noneMet = !s.leadsMet && !s.followupsMet && !s.conversionsMet;
                          const statusIcon = allMet ? '🌟' : noneMet ? '🔴' : '⚠️';
                          return (
                            <tr key={s.userId} className="hover:bg-gray-50 dark:bg-gray-800/50">
                              <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium">{s.name}</td>
                              <td className="px-4 py-2.5 text-center text-base">{statusIcon}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`font-medium ${s.leadsMet ? 'text-green-600' : 'text-red-500'}`}>{s.weeklyLeads}/{s.leadsTarget}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="font-medium text-blue-600">{s.weeklyContacts}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`font-medium ${s.followupsMet ? 'text-green-600' : 'text-red-500'}`}>{s.weeklyFollowups}/{s.followupsTarget}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`font-medium ${s.conversionsMet ? 'text-green-600' : 'text-red-500'}`}>{s.weeklyConversions}/{s.conversionsTarget}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">
                                {s.conversionRate}%
                                <div className="text-[9px] text-gray-400 dark:text-gray-500">{s.totalConverted}/{s.totalCustomers}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Weekly trend chart */}
              <div className="bg-white rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">过去 12 周趋势</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    达标率 {kpiHistory.length > 0 ? ((kpiHistory.filter(h => h.total_conversions >= kpi.weekly_conversions).length / kpiHistory.length) * 100).toFixed(0) : '—'}%
                  </span>
                </div>
                {kpiHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-8 text-center">暂无历史数据 — 周报将在每周一自动生成</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kpiHistory.map(h => ({ week: h.week_start.slice(5), leads: h.total_leads, conversions: h.total_conversions }))}>
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

              <div className="text-right">
                <Link href="/dashboard/koala/kpi-targets" className="text-xs text-amber-600 no-underline hover:underline">KPI 目标设置 →</Link>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
