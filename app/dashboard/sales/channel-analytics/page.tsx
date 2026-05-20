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

const COLORS = ['#D4A843', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6'];

export default function ChannelAnalyticsPage() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales/channel-analytics?days=${days}`).then(r => r.json()).then(d => {
      setChannels(d.channels || []);
      setFunnel(d.funnel || null);
      setLoading(false);
    });
  }, [days]);

  if (loading) return <p className="text-sm text-[#6B7280] py-8 text-center">加载中...</p>;

  const pieData = channels.filter(c => c.visits > 0).map(c => ({
    name: CH_LABELS[c.channel] || c.channel,
    value: c.visits,
  }));

  const barData = channels.map(c => ({
    name: CH_LABELS[c.channel] || c.channel,
    visits: c.visits,
    registrations: c.registrations,
    conversions: c.conversions,
  }));

  const funnelStages = funnel ? [
    { label: '访问', value: funnel.visits, color: '#3B82F6' },
    { label: '注册', value: funnel.registrations, color: '#D4A843' },
    { label: '首次付费', value: funnel.conversions, color: '#10B981' },
    { label: '续费', value: funnel.renewals, color: '#8B5CF6' },
  ] : [];
  const maxFunnel = Math.max(...funnelStages.map(s => s.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111827]">渠道分析</h1>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-[10px] px-3 py-1.5 rounded-lg transition ${
                days === d ? 'bg-[#FEF3C7] text-[#92400E] font-medium' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie chart */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#374151] mb-4">访问量分布</h2>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={(props: any) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] py-8 text-center">暂无数据</p>
          )}
        </div>

        {/* Bar chart */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#374151] mb-4">渠道转化漏斗</h2>
          {barData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="visits" fill="#3B82F6" name="访问" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="registrations" fill="#D4A843" name="注册" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="conversions" fill="#10B981" name="转化" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] py-8 text-center">暂无数据</p>
          )}
        </div>
      </div>

      {/* P6.5 Conversion funnel */}
      {funnel && funnel.visits > 0 && (
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#374151] mb-4">转化漏斗</h2>
          <div className="space-y-3">
            {funnelStages.map((stage, i) => {
              const pct = (stage.value / maxFunnel) * 100;
              const prevValue = i > 0 ? funnelStages[i - 1].value : 0;
              const convRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : null;
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#374151] font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#111827]">{stage.value}</span>
                      {convRate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]">
                          {convRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-6 rounded bg-[#F3F4F6]">
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
      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] text-[#6B7280]">
              <th className="text-left px-4 py-2.5 font-medium">渠道</th>
              <th className="text-center px-4 py-2.5 font-medium">访问</th>
              <th className="text-center px-4 py-2.5 font-medium">注册</th>
              <th className="text-center px-4 py-2.5 font-medium">转化</th>
              <th className="text-center px-4 py-2.5 font-medium">佣金</th>
              <th className="text-center px-4 py-2.5 font-medium">转化率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {channels.map(ch => (
              <tr key={ch.channel} className="hover:bg-[#F9FAFB]">
                <td className="px-4 py-2.5 font-medium text-[#111827]">{CH_LABELS[ch.channel] || ch.channel}</td>
                <td className="px-4 py-2.5 text-center text-[#374151]">{ch.visits}</td>
                <td className="px-4 py-2.5 text-center text-[#374151]">{ch.registrations}</td>
                <td className="px-4 py-2.5 text-center text-[#374151]">{ch.conversions}</td>
                <td className="px-4 py-2.5 text-center text-[#D4A843] font-medium">${ch.revenue.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-center text-[#374151]">{ch.conversion_rate}%</td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-[#6B7280]">暂无渠道数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
