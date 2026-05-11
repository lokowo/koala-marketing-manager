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

interface EngagementEntry { userId: string; displayName: string; email: string; totalScore: number; level: 'high' | 'medium' | 'low' | 'dormant'; breakdown: { chatActivity: number; professorEngagement: number; profileCompleteness: number; outreachActivity: number; recency: number }; stats: { conversationCount: number; savedProfessors: number; emailsGenerated: number; profilePct: number; daysSinceLastActive: number; registeredDaysAgo: number } }
interface EngagementSummary { high: number; medium: number; low: number; dormant: number; total: number; avgScore: number }

const LEVEL_CONFIG = {
  high: { emoji: '🔥', label: '高活跃', color: '#16a34a', bg: '#dcfce7' },
  medium: { emoji: '🟡', label: '中等', color: '#ca8a04', bg: '#fef9c3' },
  low: { emoji: '🔵', label: '低活跃', color: '#2563eb', bg: '#dbeafe' },
  dormant: { emoji: '⚪', label: '沉默', color: '#6b7280', bg: '#f3f4f6' },
};

export default function SalesOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [perSales, setPerSales] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSales, setSelectedSales] = useState<string | null>(null);
  const [engData, setEngData] = useState<EngagementEntry[]>([]);
  const [engSummary, setEngSummary] = useState<EngagementSummary | null>(null);
  const [engLoading, setEngLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/sales-overview').then(r => r.json()).then(d => {
      setSummary(d.summary ?? null);
      setPerSales(d.perSales ?? []);
      setLoading(false);
    });
  }, []);

  async function loadEngagement(salesUserId: string) {
    if (selectedSales === salesUserId) {
      setSelectedSales(null);
      return;
    }
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
        <h2 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-100">各销售数据 <span className="font-normal text-slate-400">（点击查看客户活跃度）</span></h2>
        {perSales.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-6 text-center">暂无销售数据</p>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-4 py-2 font-medium">销售</th>
                  <th className="text-center px-4 py-2 font-medium">客户</th>
                  <th className="text-center px-4 py-2 font-medium">转化</th>
                  <th className="text-center px-4 py-2 font-medium">转化率</th>
                  <th className="text-center px-4 py-2 font-medium">推广码</th>
                  <th className="text-center px-4 py-2 font-medium">扫描</th>
                  <th className="text-center px-4 py-2 font-medium">活跃度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {perSales.map(s => (
                  <tr
                    key={s.userId}
                    className={`hover:bg-slate-50 cursor-pointer ${selectedSales === s.userId ? 'bg-amber-50' : ''}`}
                    onClick={() => loadEngagement(s.userId)}
                  >
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{s.profile.display_name || s.profile.email}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{s.totalCustomers}</td>
                    <td className="px-4 py-2.5 text-center text-green-600 font-medium">{s.converted}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{s.conversionRate}%</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{s.qrcodeCount}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{s.totalScans}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs text-amber-600">{selectedSales === s.userId ? '▲ 收起' : '▶ 查看'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Engagement Drill-down Panel */}
            {selectedSales && (
              <div className="border-t-2 border-amber-200 px-4 py-4 bg-amber-50/50">
                {engLoading ? (
                  <p className="text-xs text-slate-400 text-center py-4">加载客户活跃度…</p>
                ) : (
                  <>
                    {/* Summary pills */}
                    {engSummary && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                          📊 平均分 <strong>{engSummary.avgScore}</strong>
                        </span>
                        {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
                          <span key={key} className="text-xs px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.emoji} {cfg.label} <strong>{engSummary[key as keyof typeof LEVEL_CONFIG]}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Customer rows */}
                    {engData.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center">该销售暂无客户数据</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                        {engData.map(e => {
                          const cfg = LEVEL_CONFIG[e.level];
                          return (
                            <div key={e.userId} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-slate-100">
                              {/* Score circle */}
                              <div className="size-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                                {e.totalScore}
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-slate-800 truncate">{e.displayName || e.email || '未知'}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                                    {cfg.emoji} {cfg.label}
                                  </span>
                                </div>
                                <div className="flex gap-3 mt-0.5 text-[10px] text-slate-500">
                                  <span title="对话数">💬 {e.stats.conversationCount}</span>
                                  <span title="收藏教授">📌 {e.stats.savedProfessors}</span>
                                  <span title="套磁信">✉️ {e.stats.emailsGenerated}</span>
                                  <span title="资料完整度">📝 {e.stats.profilePct}%</span>
                                  <span title="注册天数">📅 {e.stats.registeredDaysAgo}天前</span>
                                </div>
                              </div>
                              {/* Breakdown bars */}
                              <div className="flex-shrink-0 w-24 space-y-0.5">
                                {[
                                  { label: '聊天', val: e.breakdown.chatActivity, max: 30 },
                                  { label: '教授', val: e.breakdown.professorEngagement, max: 25 },
                                  { label: '套磁', val: e.breakdown.outreachActivity, max: 20 },
                                ].map(bar => (
                                  <div key={bar.label} className="flex items-center gap-1">
                                    <span className="text-[8px] text-slate-400 w-5">{bar.label}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                                      <div className="h-full rounded-full" style={{ width: `${(bar.val / bar.max) * 100}%`, background: cfg.color }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Activity indicator */}
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
    </div>
  );
}
