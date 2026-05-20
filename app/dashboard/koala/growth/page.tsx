'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

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
    <span className={`text-[10px] ml-1.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
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

  if (loading) return <div className="text-sm text-slate-400 py-12 text-center">加载中...</div>;
  if (!data) return <div className="text-sm text-slate-400 py-12 text-center">加载失败</div>;

  const { overview, channels, cohorts, tiers, referralStats, creditStats, qrStats } = data;

  const channelData = Object.entries(channels as Record<string, number>)
    .map(([key, value]) => ({ name: CHANNEL_LABELS[key] || key, value, color: CHANNEL_COLORS[key] || '#94a3b8' }))
    .filter(c => c.value > 0);

  const tierData = TIER_CONFIG.map(t => ({ name: t.label, value: (tiers as AnyObj)[t.key] ?? 0, color: t.color })).filter(t => t.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">用户增长</h2>
        <p className="text-sm text-slate-500 mt-0.5">获客、留存与变现</p>
      </div>

      {/* Overview metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="总用户" value={overview.totalUsers} />
        <MetricCard label="30天新增" value={overview.newUsers30d} delta={overview.newUsersPrev30d} accent />
        <MetricCard label="30天对话" value={overview.conversations30d} delta={overview.conversationsPrev30d} />
        <MetricCard label="30天套磁" value={overview.outreach30d} delta={overview.outreachPrev30d} />
      </div>

      {/* Channels + Engagement tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">获客渠道</h3>
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
                      <span className="text-slate-600">{c.name}</span>
                    </div>
                    <span className="font-medium text-slate-700">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-300">暂无数据</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">用户活跃分层 (30天)</h3>
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
                      <span className="text-slate-600">{t.name}</span>
                    </div>
                    <span className="font-medium text-slate-700">{t.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-slate-300">暂无数据</div>
          )}
        </div>
      </div>

      {/* Retention cohorts */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">周留存队列</h3>
        {(cohorts ?? []).length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-3 py-2 font-medium">注册周</th>
                  <th className="text-center px-3 py-2 font-medium">新增</th>
                  <th className="text-center px-3 py-2 font-medium">次周留存</th>
                  <th className="text-center px-3 py-2 font-medium">留存率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(cohorts as AnyObj[]).map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600">{c.week}</td>
                    <td className="px-3 py-2 text-center text-slate-700 font-medium">{c.total}</td>
                    <td className="px-3 py-2 text-center text-slate-700">{c.retained}</td>
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
          <div className="h-[160px] flex items-center justify-center text-sm text-slate-300">暂无数据</div>
        )}
      </div>

      {/* Referral + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">推荐计划</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-slate-50">
              <div className="text-2xl font-bold text-slate-800">{referralStats?.totalReferrers ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">推荐人</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-50">
              <div className="text-2xl font-bold text-emerald-600">{referralStats?.totalReferred ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">被推荐用户</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-50">
              <div className="text-2xl font-bold text-blue-600">{referralStats?.referralRate ?? 0}%</div>
              <div className="text-[10px] text-slate-400 mt-1">推荐占比</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">变现指标 (30天)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xl font-bold text-amber-600">{creditStats?.totalSpent ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">积分消耗</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xl font-bold text-slate-800">{creditStats?.purchaseCount ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">购买次数</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xl font-bold text-blue-600">{creditStats?.spenders ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">付费用户</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="text-xl font-bold text-emerald-600">{creditStats?.totalEarned ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">积分发放</div>
            </div>
          </div>
        </div>
      </div>

      {/* QR code performance */}
      {(qrStats ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">推广码效果 Top 10</h3>
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

function MetricCard({ label, value, delta, accent }: { label: string; value: number; delta?: number; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-[10px] text-slate-400 mb-1">{label}</div>
      <div className="flex items-baseline">
        <span className={`text-2xl font-bold ${accent ? 'text-blue-600' : 'text-slate-800'}`}>{value.toLocaleString()}</span>
        {delta !== undefined && <Delta current={value} previous={delta} />}
      </div>
    </div>
  );
}
