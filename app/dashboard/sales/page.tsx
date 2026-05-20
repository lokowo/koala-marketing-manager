'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '待确认', bg: '#FEF3C7', text: '#92400E' },
  confirmed: { label: '已确认', bg: '#DCFCE7', text: '#166534' },
  paid_out: { label: '已发放', bg: '#DBEAFE', text: '#1E40AF' },
  rejected: { label: '已拒绝', bg: '#FEE2E2', text: '#991B1B' },
  refunded: { label: '已退款', bg: '#F3F4F6', text: '#6B7280' },
};

const CH_LABELS: Record<string, string> = {
  wechat: '📱 微信', xiaohongshu: '📕 小红书', douyin: '🎵 抖音',
  weibo: '🔥 微博', zhihu: '💡 知乎', bilibili: '📺 B站',
  email: '✉️ 邮件', whatsapp: '💬 WhatsApp', other: '🔗 其他',
};

const CH_COLORS: Record<string, string> = {
  wechat: '#22C55E', xiaohongshu: '#EF4444', douyin: '#1E293B',
  zhihu: '#0066FF', bilibili: '#00A1D6', email: '#3B82F6',
  weibo: '#EF4444', whatsapp: '#22C55E', other: '#6B7280',
};

const TIER_CFG: Record<string, { label: string; bg: string; text: string }> = {
  bronze: { label: 'Bronze', bg: '#FEF3C7', text: '#92400E' },
  silver: { label: 'Silver', bg: '#F3F4F6', text: '#374151' },
  gold: { label: 'Gold', bg: '#FEF3C7', text: '#92400E' },
  platinum: { label: 'Platinum', bg: '#DBEAFE', text: '#1E40AF' },
};

const PRODUCT_LABELS: Record<string, string> = {
  credit_starter: '入门包', credit_standard: '标准包', credit_pro: '专业包', credit_flagship: '旗舰包',
  sub_starter: 'Starter订阅', sub_pro: 'Pro订阅', sub_elite: 'Elite订阅', default: '其他',
};

interface DashData {
  agent: { display_name: string; referral_code: string; tier: string };
  kpi: {
    commission: { current: number; last_month: number; change_pct: number };
    visits: { current: number; target: number; pct: number };
    registrations: { current: number; target: number; pct: number };
    conversions: { current: number; rate: number };
  };
  trend_30d: { date: string; visits: number; registrations: number }[];
  team_ranking: { rank: number; name: string; commission: number; is_me: boolean }[];
  channel_breakdown: { channel: string; visits: number; pct: number }[];
  funnel: { visits: number; registrations: number; payments: number; renewals: number };
  recent_commissions: { date: string; user_name: string; product: string; amount: number; status: string }[];
}

export default function SalesDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sales/dashboard-stats');
      if (res.ok) {
        setData(await res.json());
      } else if (res.status === 401) {
        router.replace('/login');
        return;
      } else if (res.status === 403) {
        setError('你还不是活跃的销售人员，请联系管理员开通权限。');
      } else {
        setError('加载仪表盘数据失败，请刷新页面重试。');
      }
    } catch {
      setError('网络连接失败，请检查网络后重试。');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      loadData();
    });
  }, [router, loadData]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-[#6B7280]">加载中...</p></div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-[#991B1B]">{error || '加载失败'}</p>
        <button onClick={loadData} className="text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition">
          重试
        </button>
      </div>
    );
  }

  const { agent, kpi, trend_30d, team_ranking, channel_breakdown, funnel, recent_commissions } = data;
  const tierCfg = TIER_CFG[agent.tier] || TIER_CFG.bronze;

  function copyCode() {
    navigator.clipboard.writeText(agent.referral_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  const maxChannel = Math.max(...channel_breakdown.map(c => c.visits), 1);

  return (
    <div className="text-[#111827] max-w-5xl mx-auto space-y-5">

      {/* A: Welcome Bar */}
      <div className="flex items-center justify-between rounded-xl p-4 bg-white border border-[#E5E7EB]">
        <div>
          <h1 className="text-lg font-bold">你好，{agent.display_name}！</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-[#6B7280]">
            推广码:
            <button onClick={copyCode} className="font-mono font-bold text-[#F59E0B] hover:underline cursor-pointer">
              {agent.referral_code}
            </button>
            {codeCopied && <span className="text-[10px] text-[#22C55E]">已复制</span>}
          </div>
        </div>
        <span className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ background: tierCfg.bg, color: tierCfg.text }}>
          {tierCfg.label}
        </span>
      </div>

      {/* B: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '本月佣金', icon: '💰', value: `$${kpi.commission.current.toFixed(2)}`, sub: kpi.commission.change_pct !== 0 ? `${kpi.commission.change_pct > 0 ? '↑' : '↓'}${Math.abs(kpi.commission.change_pct)}% vs上月` : '', subColor: kpi.commission.change_pct >= 0 ? '#22C55E' : '#EF4444', href: '/dashboard/sales/my-commissions' },
          { label: '本月访问', icon: '👁', value: String(kpi.visits.current), sub: kpi.visits.target > 0 ? `目标${kpi.visits.target} ${kpi.visits.pct}%` : '', pct: kpi.visits.pct, href: '/dashboard/sales/channel-analytics' },
          { label: '本月注册', icon: '📝', value: String(kpi.registrations.current), sub: kpi.registrations.target > 0 ? `目标${kpi.registrations.target} ${kpi.registrations.pct}%` : '', pct: kpi.registrations.pct, href: '/dashboard/sales/referral-users' },
          { label: '本月转化', icon: '💳', value: String(kpi.conversions.current), sub: `转化率 ${kpi.conversions.rate}%`, href: '/dashboard/sales/referral-users' },
        ].map(item => (
          <Link key={item.label} href={item.href} className="rounded-xl p-4 bg-white border border-[#E5E7EB] hover:border-[#F59E0B]/40 hover:shadow-sm transition no-underline group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#6B7280]">{item.icon} {item.label}</span>
              {item.subColor && item.sub && <span className="text-[10px] font-medium" style={{ color: item.subColor }}>{item.sub}</span>}
            </div>
            <div className="text-2xl font-medium text-[#111827]">{item.value}</div>
            {item.pct != null && item.pct > 0 && (
              <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-[#F3F4F6]">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(item.pct, 100)}%`, background: item.pct >= 100 ? '#22C55E' : item.pct > 60 ? '#F59E0B' : '#EF4444' }} />
              </div>
            )}
            {!item.subColor && item.sub && <div className="mt-1 text-[10px] text-[#6B7280]">{item.sub}</div>}
          </Link>
        ))}
      </div>

      {/* C: Trend + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-3 rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#374151] mb-4">业绩趋势 (30天)</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend_30d}>
                <defs>
                  <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }} labelFormatter={v => v} />
                <Area type="monotone" dataKey="visits" name="访问" stroke="#F59E0B" fill="url(#visitGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="registrations" name="注册" stroke="#3B82F6" fill="url(#regGrad)" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-[#6B7280]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#F59E0B]" />访问</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#3B82F6] border-dashed" style={{ borderTop: '1px dashed #3B82F6', height: 0 }} />注册</span>
          </div>
        </div>

        {/* Team Ranking */}
        <div className="lg:col-span-2 rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#374151] mb-3">团队排名</h2>
          {team_ranking.length > 0 ? (
            <div className="space-y-1.5">
              {team_ranking.map(r => {
                const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`;
                return (
                  <div
                    key={r.rank + r.name}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs ${
                      r.is_me ? 'bg-[#FEF3C7] border-l-3' : 'bg-[#F9FAFB]'
                    }`}
                    style={r.is_me ? { borderLeftWidth: 3, borderLeftColor: '#F59E0B' } : {}}
                  >
                    <span className="w-6 text-center font-bold text-[#F59E0B]">{medal}</span>
                    <span className={`flex-1 ${r.is_me ? 'font-semibold text-[#111827]' : 'text-[#374151]'}`}>
                      {r.name} {r.is_me && '(我)'}
                    </span>
                    <span className="font-medium text-[#22C55E]">${r.commission}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] py-4 text-center">暂无排名数据</p>
          )}
        </div>
      </div>

      {/* D: Channels + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel Breakdown */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#374151] mb-3">渠道表现</h2>
          {channel_breakdown.length > 0 ? (
            <div className="space-y-2.5">
              {channel_breakdown.map(ch => (
                <Link key={ch.channel} href="/dashboard/sales/channel-analytics" className="block no-underline group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#374151]">{CH_LABELS[ch.channel] || ch.channel}</span>
                    <span className="text-[10px] text-[#6B7280]">{ch.visits} · {ch.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[#F3F4F6]">
                    <div
                      className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                      style={{ width: `${(ch.visits / maxChannel) * 100}%`, background: CH_COLORS[ch.channel] || '#6B7280' }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] py-4 text-center">暂无渠道数据</p>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
          <h2 className="text-sm font-semibold text-[#374151] mb-3">转化漏斗</h2>
          <div className="space-y-3">
            {[
              { label: '访问', value: funnel.visits, color: '#F59E0B', pct: 100 },
              { label: '注册', value: funnel.registrations, color: '#3B82F6', pct: funnel.visits > 0 ? Math.round((funnel.registrations / funnel.visits) * 100) : 0 },
              { label: '付费', value: funnel.payments, color: '#22C55E', pct: funnel.registrations > 0 ? Math.round((funnel.payments / funnel.registrations) * 100) : 0 },
              { label: '续费', value: funnel.renewals, color: '#8B5CF6', pct: funnel.payments > 0 ? Math.round((funnel.renewals / funnel.payments) * 100) : 0 },
            ].map((stage, i) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#374151]">{stage.label}</span>
                  <span className="text-xs font-medium" style={{ color: stage.color }}>
                    {stage.value} {i > 0 && <span className="text-[10px] text-[#6B7280]">({stage.pct}%)</span>}
                  </span>
                </div>
                <div className="h-6 rounded-lg overflow-hidden bg-[#F3F4F6]">
                  <div
                    className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max(stage.pct, 5)}%`, background: stage.color + '20' }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: stage.color }}>{stage.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* E: Recent Commissions */}
      <div className="rounded-xl p-5 bg-white border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#374151]">最近佣金</h2>
          <Link href="/dashboard/sales/my-commissions" className="text-[11px] text-[#F59E0B] font-medium no-underline hover:underline">查看全部 →</Link>
        </div>
        {recent_commissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left py-2 text-[#6B7280] font-medium">日期</th>
                  <th className="text-left py-2 text-[#6B7280] font-medium">用户</th>
                  <th className="text-left py-2 text-[#6B7280] font-medium hidden sm:table-cell">产品</th>
                  <th className="text-right py-2 text-[#6B7280] font-medium">佣金</th>
                  <th className="text-right py-2 text-[#6B7280] font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {recent_commissions.map((c, i) => {
                  const st = STATUS_CFG[c.status] || STATUS_CFG.pending;
                  return (
                    <tr key={i} className="border-b border-[#F3F4F6] last:border-0">
                      <td className="py-2.5 text-[#374151]">{new Date(c.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-[#F3F4F6] text-[#374151]">
                            {(c.user_name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-[#111827]">{c.user_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[#6B7280] hidden sm:table-cell">{PRODUCT_LABELS[c.product] || c.product}</td>
                      <td className="py-2.5 text-right font-medium text-[#22C55E]">${c.amount.toFixed(2)}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[#6B7280] py-4 text-center">暂无佣金记录</p>
        )}
      </div>

      {/* F: Quick Promo Bar */}
      <div className="rounded-xl p-4 bg-white border border-[#E5E7EB] flex items-center gap-3 overflow-x-auto">
        <span className="text-xs text-[#6B7280] whitespace-nowrap">快速推广:</span>
        {['wechat', 'xiaohongshu', 'douyin'].map(ch => (
          <button
            key={ch}
            onClick={() => {
              navigator.clipboard.writeText(`https://koalaphd.com/?ref=${agent.referral_code}&ch=${ch}`);
              setCodeCopied(true);
              setTimeout(() => setCodeCopied(false), 2000);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition whitespace-nowrap"
          >
            {CH_LABELS[ch]?.split(' ')[0]} 复制
          </button>
        ))}
        <Link href="/dashboard/sales/promo-center" className="ml-auto text-[11px] text-[#F59E0B] font-medium no-underline whitespace-nowrap hover:underline">
          打开推广中心 →
        </Link>
      </div>
    </div>
  );
}
