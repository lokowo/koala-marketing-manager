'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { MetricLabel } from '../../../../components/ui/metric-label';
import { METRICS } from '../../../../lib/metrics-glossary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const CHANNEL_LABELS: Record<string, string> = { direct: '直接注册', referral: '好友推荐', sales_qr: '销售推广码' };
const CHANNEL_COLORS: Record<string, string> = { direct: '#3b82f6', referral: '#10b981', sales_qr: '#f59e0b' };
const TIER_CONFIG = [
  { key: 'power', label: '深度用户 (20+次)', color: '#8b5cf6' },
  { key: 'active', label: '活跃用户 (5-19次)', color: '#3b82f6' },
  { key: 'casual', label: '轻度用户 (1-4次)', color: '#f59e0b' },
  { key: 'dormant', label: '沉睡用户 (0次)', color: '#94a3b8' },
];

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-[10px] ml-1.5 ${up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
      {up ? '↑' : '↓'}{Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function GrowthPage() {
  const [data, setData] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/growth')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="h-[180px] bg-gray-50 dark:bg-gray-700/30 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
  if (!data) return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
      </div>
      <div className="py-12 text-center">
        <div className="inline-block h-5 w-40 bg-red-100 dark:bg-red-900/30 rounded animate-pulse" />
      </div>
    </div>
  );

  const { overview, channels, cohorts, tiers, referralStats, creditStats, qrStats } = data;

  const channelData = Object.entries(channels as Record<string, number>)
    .map(([key, value]) => ({ name: CHANNEL_LABELS[key] || key, value, color: CHANNEL_COLORS[key] || '#94a3b8' }))
    .filter(c => c.value > 0);

  const tierData = TIER_CONFIG.map(t => ({ name: t.label, value: (tiers as AnyObj)[t.key] ?? 0, color: t.color })).filter(t => t.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">用户增长</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">获客、留存与变现</p>
      </div>

      {/* Overview metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label={METRICS.totalUsers.label} tooltip={METRICS.totalUsers.tooltip} value={overview.totalUsers} />
        <MetricCard label={METRICS.newUsers30d.label} tooltip={METRICS.newUsers30d.tooltip} value={overview.newUsers30d} delta={overview.newUsersPrev30d} accent />
        <MetricCard label={METRICS.conversations30d.label} tooltip={METRICS.conversations30d.tooltip} value={overview.conversations30d} delta={overview.conversationsPrev30d} />
        <MetricCard label={METRICS.outreach30d.label} tooltip={METRICS.outreach30d.tooltip} value={overview.outreach30d} delta={overview.outreachPrev30d} />
      </div>

      {/* Channels + Engagement tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">获客渠道</h3>
          {channelData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                    {channelData.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {channelData.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                      <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">用户活跃分层 (30天)</h3>
          {tierData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                    {tierData.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {tierData.map(t => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.color }} />
                      <span className="text-gray-600 dark:text-gray-400">{t.name}</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
          )}
        </div>
      </div>

      {/* Retention cohorts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">周留存队列</h3>
        {(cohorts ?? []).length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-3 py-2 font-medium"><MetricLabel label={METRICS.registrationWeek.label} tooltip={METRICS.registrationWeek.tooltip} /></th>
                  <th className="text-center px-3 py-2 font-medium"><MetricLabel label={METRICS.newUsersWeekly.label} tooltip={METRICS.newUsersWeekly.tooltip} /></th>
                  <th className="text-center px-3 py-2 font-medium"><MetricLabel label={METRICS.nextWeekRetention.label} tooltip={METRICS.nextWeekRetention.tooltip} /></th>
                  <th className="text-center px-3 py-2 font-medium"><MetricLabel label={METRICS.retentionRate.label} tooltip={METRICS.retentionRate.tooltip} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(cohorts as AnyObj[]).map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.week}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300 font-medium">{c.total}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{c.retained}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block w-12 py-0.5 rounded text-center text-[11px] font-medium ${
                        parseInt(c.rate) >= 40 ? 'bg-emerald-100 text-emerald-800' :
                        parseInt(c.rate) >= 20 ? 'bg-emerald-50 text-emerald-700' :
                        parseInt(c.rate) >= 10 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {c.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-sm text-gray-300 dark:text-gray-600">暂无数据</div>
        )}
      </div>

      {/* Referral + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">推荐计划</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-2xl font-medium text-gray-800 dark:text-gray-100">{referralStats?.totalReferrers ?? 0}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1"><MetricLabel label={METRICS.referrers.label} tooltip={METRICS.referrers.tooltip} /></div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-2xl font-medium text-emerald-600 dark:text-emerald-400">{referralStats?.totalReferred ?? 0}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1"><MetricLabel label={METRICS.referredUsers.label} tooltip={METRICS.referredUsers.tooltip} /></div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-2xl font-medium text-blue-600 dark:text-blue-400">{referralStats?.referralRate ?? 0}%</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1"><MetricLabel label={METRICS.referralRatio.label} tooltip={METRICS.referralRatio.tooltip} /></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">变现指标 (30天)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-xl font-medium text-amber-600 dark:text-amber-400">{creditStats?.totalSpent ?? 0}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1"><MetricLabel label={METRICS.creditsConsumed.label} tooltip={METRICS.creditsConsumed.tooltip} /></div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-xl font-medium text-gray-800 dark:text-gray-100">{creditStats?.purchaseCount ?? 0}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1"><MetricLabel label={METRICS.purchaseCount.label} tooltip={METRICS.purchaseCount.tooltip} /></div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-xl font-medium text-blue-600 dark:text-blue-400">{creditStats?.spenders ?? 0}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1"><MetricLabel label={METRICS.paidUsers.label} tooltip={METRICS.paidUsers.tooltip} /></div>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-xl font-medium text-emerald-600 dark:text-emerald-400">{creditStats?.totalEarned ?? 0}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1"><MetricLabel label={METRICS.creditsIssued.label} tooltip={METRICS.creditsIssued.tooltip} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* QR code performance */}
      {(qrStats ?? []).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">推广码效果 Top 10</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={qrStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="code" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Bar dataKey="scans" fill="#f59e0b" radius={[0, 4, 4, 0]} name="扫码量" barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, tooltip, value, delta, accent }: { label: string; tooltip?: string; value: number; delta?: number; accent?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
        {tooltip ? <MetricLabel label={label} tooltip={tooltip} /> : label}
      </div>
      <div className="flex items-baseline">
        <span className={`text-2xl font-medium ${accent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{value.toLocaleString()}</span>
        {delta !== undefined && <Delta current={value} previous={delta} />}
      </div>
    </div>
  );
}
