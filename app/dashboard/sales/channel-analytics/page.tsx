'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ChannelData {
  channel: string;
  visits: number;
  registrations: number;
  conversions: number;
  revenue: number;
  conversion_rate: string;
}

interface FunnelData {
  visits: number;
  registrations: number;
  conversions: number;
  renewals: number;
}

const CH_LABELS: Record<string, string> = {
  wechat: '微信', xiaohongshu: '小红书', douyin: '抖音', weibo: '微博',
  zhihu: '知乎', bilibili: 'Bilibili', email: '邮件', whatsapp: 'WhatsApp',
  offline: '线下', survey: '调研', other: '其他', unknown: '未知',
};

const CH_COLORS: Record<string, string> = {
  wechat: '#22C55E', xiaohongshu: '#EF4444', douyin: '#1E293B',
  zhihu: '#0066FF', bilibili: '#00A1D6', email: '#3B82F6',
  weibo: '#FF6900', whatsapp: '#25D366', offline: '#8B5CF6',
  survey: '#F59E0B', other: '#9CA3AF', unknown: '#D1D5DB',
};

export default function ChannelAnalyticsPage() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sales/channel-analytics?days=${days}`).then(r => {
      if (!r.ok) throw new Error(r.status === 403 ? '你还不是活跃的销售人员' : '加载失败');
      return r.json();
    }).then(d => {
      setChannels(d.channels || []);
      setFunnel(d.funnel || null);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-sm text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">加载中...</p>;
  if (error) return <p className="text-sm text-[#991B1B] dark:text-[#F87171] py-8 text-center">{error}</p>;

  const pieData = channels.filter(c => c.visits > 0).map(c => ({
    name: CH_LABELS[c.channel] || c.channel,
    value: c.visits,
    color: CH_COLORS[c.channel] || '#9CA3AF',
  }));

  const barData = channels.map(c => ({
    name: CH_LABELS[c.channel] || c.channel,
    visits: c.visits,
    registrations: c.registrations,
    conversions: c.conversions,
  }));

  const funnelStages = funnel ? [
    { label: '访问', value: funnel.visits, color: '#3B82F6' },
    { label: '注册', value: funnel.registrations, color: '#F59E0B' },
    { label: '首次付费', value: funnel.conversions, color: '#10B981' },
    { label: '续费', value: funnel.renewals, color: '#8B5CF6' },
  ] : [];
  const maxFunnel = Math.max(...funnelStages.map(s => s.value), 1);

  const totalVisits = channels.reduce((s, c) => s + c.visits, 0);
  const totalRegs = channels.reduce((s, c) => s + c.registrations, 0);
  const totalConversions = channels.reduce((s, c) => s + c.conversions, 0);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">渠道分析</h1>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-[10px] px-3 py-1.5 rounded-lg transition ${
                days === d ? 'bg-[#FEF3C7] dark:bg-[#F59E0B]/20 text-[#92400E] font-medium' : 'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'
              }`}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '总访问', value: totalVisits, color: '#3B82F6' },
          { label: '总注册', value: totalRegs, color: '#F59E0B' },
          { label: '总转化', value: totalConversions, color: '#10B981' },
          { label: '总佣金', value: `$${totalRevenue.toFixed(2)}`, color: '#D4A843' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
            <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] mb-0.5">{item.label}</div>
            <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie chart */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-medium text-[#374151] dark:text-[#CBD5E1] mb-4">访问量分布</h2>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={2}
                    label={({ x, y, name, percent }: any) => (
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#374151">
                        {name} {(percent * 100).toFixed(0)}%
                      </text>
                    )}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">暂无数据</p>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {pieData.map(entry => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
                <div className="size-2 rounded-full" style={{ background: entry.color }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-medium text-[#374151] dark:text-[#CBD5E1] mb-4">渠道转化对比</h2>
          {barData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="visits" fill="#3B82F6" name="访问" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="registrations" fill="#F59E0B" name="注册" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="conversions" fill="#10B981" name="转化" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] py-8 text-center">暂无数据</p>
          )}
        </div>
      </div>

      {/* Conversion funnel */}
      {funnel && funnel.visits > 0 && (
        <div className="rounded-xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-medium text-[#374151] dark:text-[#CBD5E1] mb-4">转化漏斗</h2>
          <div className="space-y-3">
            {funnelStages.map((stage, i) => {
              const pct = (stage.value / maxFunnel) * 100;
              const prevValue = i > 0 ? funnelStages[i - 1].value : 0;
              const convRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : null;
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#374151] dark:text-[#CBD5E1] font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#111827] dark:text-[#F1F5F9]">{stage.value}</span>
                      {convRate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8]">
                          {convRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-6 rounded bg-[#F3F4F6] dark:bg-[#334155]">
                    <div
                      className="h-full rounded flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max(pct, 5)}%`, background: stage.color + '20' }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: stage.color }}>{stage.value}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel detail table */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E5E7EB] dark:border-[#334155] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] dark:bg-[#0F172A] text-[#6B7280] dark:text-[#94A3B8]">
                <th className="text-left px-4 py-2.5 font-medium">渠道</th>
                <th className="text-center px-4 py-2.5 font-medium">访问</th>
                <th className="text-center px-4 py-2.5 font-medium">注册</th>
                <th className="text-center px-4 py-2.5 font-medium">转化</th>
                <th className="text-center px-4 py-2.5 font-medium">佣金</th>
                <th className="text-center px-4 py-2.5 font-medium">转化率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#334155]">
              {channels.map(ch => (
                <tr key={ch.channel} className="hover:bg-[#FFFBEB] dark:hover:bg-[#F59E0B]/5">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full flex-shrink-0" style={{ background: CH_COLORS[ch.channel] || '#9CA3AF' }} />
                      <span className="font-medium text-[#111827] dark:text-[#F1F5F9]">{CH_LABELS[ch.channel] || ch.channel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center text-[#374151] dark:text-[#CBD5E1]">{ch.visits}</td>
                  <td className="px-4 py-2.5 text-center text-[#374151] dark:text-[#CBD5E1]">{ch.registrations}</td>
                  <td className="px-4 py-2.5 text-center text-[#374151] dark:text-[#CBD5E1]">{ch.conversions}</td>
                  <td className="px-4 py-2.5 text-center text-[#D4A843] font-medium">${ch.revenue.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-center text-[#374151] dark:text-[#CBD5E1]">{ch.conversion_rate}%</td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-[#6B7280] dark:text-[#94A3B8]">暂无渠道数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
