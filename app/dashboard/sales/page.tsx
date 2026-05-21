'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  IconCoins,
  IconEye,
  IconUserPlus,
  IconCreditCard,
  IconBrandWechat,
  IconBook,
  IconMusic,
} from '@tabler/icons-react';

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; darkBg?: string; darkText?: string }> = {
  pending: { label: '待确认', bg: '#FEF3C7', text: '#92400E', darkBg: '#F59E0B20', darkText: '#FBBF24' },
  confirmed: { label: '已确认', bg: '#DCFCE7', text: '#166534', darkBg: '#22C55E20', darkText: '#4ADE80' },
  paid_out: { label: '已发放', bg: '#DBEAFE', text: '#1E40AF', darkBg: '#3B82F620', darkText: '#60A5FA' },
  rejected: { label: '已拒绝', bg: '#FEE2E2', text: '#991B1B', darkBg: '#EF444420', darkText: '#F87171' },
  refunded: { label: '已退款', bg: '#F3F4F6', text: '#6B7280', darkBg: '#33415520', darkText: '#94A3B8' },
};

const CH_LABELS: Record<string, string> = {
  wechat: '微信', xiaohongshu: '小红书', douyin: '抖音',
  weibo: '微博', zhihu: '知乎', bilibili: 'B站',
  email: '邮件', whatsapp: 'WhatsApp', other: '其他',
};

const CH_COLORS: Record<string, string> = {
  wechat: '#22C55E', xiaohongshu: '#EF4444', douyin: '#1E293B',
  zhihu: '#0066FF', bilibili: '#00A1D6', email: '#3B82F6',
  weibo: '#FF6900', whatsapp: '#22C55E', other: '#6B7280',
};

const TIER_CFG: Record<string, { label: string; bg: string; text: string }> = {
  bronze: { label: 'Bronze', bg: '#F59E0B10', text: '#D97706' },
  silver: { label: 'Silver', bg: '#94A3B815', text: '#64748B' },
  gold: { label: 'Gold', bg: '#F59E0B15', text: '#D97706' },
  platinum: { label: 'Platinum', bg: '#3B82F615', text: '#3B82F6' },
};

const PRODUCT_LABELS: Record<string, string> = {
  credit_starter: '入门包', credit_standard: '标准包', credit_pro: '专业包', credit_flagship: '旗舰包',
  sub_starter: 'Starter订阅', sub_pro: 'Pro订阅', sub_elite: 'Elite订阅', default: '其他',
};

const QUICK_CHANNELS = [
  { key: 'wechat', label: '微信', icon: IconBrandWechat, color: '#22C55E' },
  { key: 'xiaohongshu', label: '小红书', icon: IconBook, color: '#EF4444' },
  { key: 'douyin', label: '抖音', icon: IconMusic, color: '#1E293B' },
];

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
  const [codeCopied, setCodeCopied] = useState<string | false>(false);
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
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-[#6B7280] dark:text-[#94A3B8]">加载中...</p></div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-[#991B1B] dark:text-[#F87171]">{error || '加载失败'}</p>
        <button onClick={loadData} className="text-xs px-4 py-2 rounded-lg bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#E2E8F0] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition">
          重试
        </button>
      </div>
    );
  }

  const { agent, kpi, trend_30d, team_ranking, channel_breakdown, funnel, recent_commissions } = data;
  const tierCfg = TIER_CFG[agent.tier] || TIER_CFG.bronze;

  function copyCode(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCodeCopied(key);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  const maxChannel = Math.max(...channel_breakdown.map(c => c.visits), 1);

  const KPI_CARDS = [
    { label: '本月佣金', icon: IconCoins, iconBg: 'bg-[#FEF3C7] dark:bg-[#F59E0B]/20', iconColor: 'text-[#F59E0B]', value: `$${kpi.commission.current.toFixed(2)}`, valueColor: 'text-[#059669] dark:text-[#34D399]', sub: kpi.commission.change_pct !== 0 ? `${kpi.commission.change_pct > 0 ? '↑' : '↓'}${Math.abs(kpi.commission.change_pct)}% vs上月` : '', subColor: kpi.commission.change_pct >= 0 ? 'text-[#059669]' : 'text-[#EF4444]', href: '/dashboard/sales/my-commissions' },
    { label: '本月访问', icon: IconEye, iconBg: 'bg-[#DBEAFE] dark:bg-[#3B82F6]/20', iconColor: 'text-[#3B82F6]', value: String(kpi.visits.current), valueColor: 'text-[#1E293B] dark:text-[#E2E8F0]', sub: kpi.visits.target > 0 ? `目标${kpi.visits.target}` : '', subColor: 'text-[#64748B]', pct: kpi.visits.pct, href: '/dashboard/sales/channel-analytics' },
    { label: '本月注册', icon: IconUserPlus, iconBg: 'bg-[#DCFCE7] dark:bg-[#22C55E]/20', iconColor: 'text-[#22C55E]', value: String(kpi.registrations.current), valueColor: 'text-[#1E293B] dark:text-[#E2E8F0]', sub: kpi.registrations.target > 0 ? `目标${kpi.registrations.target}` : '', subColor: 'text-[#64748B]', pct: kpi.registrations.pct, href: '/dashboard/sales/referral-users' },
    { label: '本月转化', icon: IconCreditCard, iconBg: 'bg-[#F3E8FF] dark:bg-[#8B5CF6]/20', iconColor: 'text-[#8B5CF6]', value: String(kpi.conversions.current), valueColor: 'text-[#1E293B] dark:text-[#E2E8F0]', sub: `转化率 ${kpi.conversions.rate}%`, subColor: 'text-[#64748B]', href: '/dashboard/sales/referral-users' },
  ];

  return (
    <div className="text-[#1E293B] dark:text-[#E2E8F0] max-w-5xl mx-auto space-y-5">

      {/* A: Welcome Bar — warm gradient */}
      <div className="flex items-center justify-between rounded-2xl p-5 bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] dark:from-[#1C1917] dark:to-[#292524] border border-[#FDE68A]/30 dark:border-[#F59E0B]/20">
        <div>
          <h1 className="text-xl font-light tracking-tight text-[#111827] dark:text-[#F1F5F9]">你好，{agent.display_name}！</h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
            推广码:
            <button
              onClick={() => copyCode(agent.referral_code, 'code')}
              className="font-mono font-bold text-[#F59E0B] bg-[#FEF3C7] dark:bg-[#F59E0B]/20 px-2 py-0.5 rounded text-sm cursor-pointer hover:bg-[#FDE68A] dark:hover:bg-[#F59E0B]/30 transition"
            >
              {agent.referral_code}
            </button>
            {codeCopied === 'code' && <span className="text-[10px] text-[#22C55E] font-medium">已复制 ✓</span>}
          </div>
        </div>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full border border-[#F59E0B]/20"
          style={{ background: tierCfg.bg, color: tierCfg.text }}
        >
          {tierCfg.label}
        </span>
      </div>

      {/* B: KPI Cards — colored icon backgrounds, hover lift */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_CARDS.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-2xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] hover:shadow-md hover:-translate-y-0.5 transition-all no-underline group"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                  <Icon size={16} className={item.iconColor} />
                </div>
                <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">{item.label}</span>
              </div>
              <div className={`text-2xl font-bold ${item.valueColor}`}>{item.value}</div>
              {item.sub && (
                <div className={`mt-2 text-xs ${item.subColor}`}>
                  {item.sub}
                  {item.pct != null && ` · ${item.pct}%`}
                </div>
              )}
              {item.pct != null && item.pct > 0 && (
                <div className="mt-3 h-1.5 rounded-full bg-[#F1F5F9] dark:bg-[#334155] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EAB308] transition-all duration-500"
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* C: Trend + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-3 rounded-2xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-semibold text-[#374151] dark:text-[#E2E8F0] mb-4">业绩趋势 (30天)</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend_30d}>
                <defs>
                  <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white' }} labelFormatter={v => v} />
                <Area type="monotone" dataKey="visits" name="访问" stroke="#F59E0B" strokeWidth={2.5} fill="url(#visitGrad)" />
                <Area type="monotone" dataKey="registrations" name="注册" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" fill="url(#regGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] rounded-full bg-[#F59E0B]" />访问</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dashed border-[#3B82F6]" />注册</span>
          </div>
        </div>

        {/* Team Ranking — gold/silver/bronze borders */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-semibold text-[#374151] dark:text-[#E2E8F0] mb-3">团队排名</h2>
          {team_ranking.length > 0 ? (
            <div className="space-y-1.5">
              {team_ranking.map(r => {
                const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`;
                const rankBg = r.is_me
                  ? 'bg-[#FEF3C7] dark:bg-[#F59E0B]/10 border-l-4 border-[#F59E0B]'
                  : r.rank === 1
                    ? 'bg-gradient-to-r from-[#FEF3C7] to-[#FFFBEB] dark:from-[#F59E0B]/10 dark:to-transparent border-l-4 border-[#F59E0B]'
                    : r.rank === 2
                      ? 'bg-[#F8FAFC] dark:bg-[#334155]/50 border-l-4 border-[#94A3B8]'
                      : r.rank === 3
                        ? 'bg-[#FEF3C7]/50 dark:bg-[#D97706]/10 border-l-4 border-[#D97706]'
                        : 'bg-[#F9FAFB] dark:bg-[#334155]/30';
                return (
                  <div
                    key={r.rank + r.name}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs ${rankBg}`}
                  >
                    <span className="w-6 text-center font-bold text-[#F59E0B]">{medal}</span>
                    <span className={`flex-1 ${r.is_me ? 'font-bold text-[#111827] dark:text-[#F1F5F9]' : 'text-[#374151] dark:text-[#CBD5E1]'}`}>
                      {r.name} {r.is_me && <span className="text-[10px] text-[#F59E0B]">(我)</span>}
                    </span>
                    <span className="font-semibold text-[#059669] dark:text-[#34D399]">${r.commission}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] dark:text-[#64748B] py-4 text-center">暂无排名数据</p>
          )}
        </div>
      </div>

      {/* D: Channels + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel Breakdown — 8px bars */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-semibold text-[#374151] dark:text-[#E2E8F0] mb-3">渠道表现</h2>
          {channel_breakdown.length > 0 ? (
            <div className="space-y-3">
              {channel_breakdown.map(ch => (
                <Link key={ch.channel} href="/dashboard/sales/channel-analytics" className="block no-underline group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#374151] dark:text-[#CBD5E1] font-medium">{CH_LABELS[ch.channel] || ch.channel}</span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">{ch.visits} · {ch.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[#F1F5F9] dark:bg-[#334155]">
                    <div
                      className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                      style={{ width: `${(ch.visits / maxChannel) * 100}%`, background: CH_COLORS[ch.channel] || '#6B7280' }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] dark:text-[#64748B] py-4 text-center">暂无渠道数据</p>
          )}
        </div>

        {/* Conversion Funnel — 28px bars */}
        <div className="rounded-2xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
          <h2 className="text-sm font-semibold text-[#374151] dark:text-[#E2E8F0] mb-3">转化漏斗</h2>
          <div className="space-y-3">
            {[
              { label: '访问', value: funnel.visits, color: '#F59E0B', pct: 100 },
              { label: '注册', value: funnel.registrations, color: '#3B82F6', pct: funnel.visits > 0 ? Math.round((funnel.registrations / funnel.visits) * 100) : 0 },
              { label: '付费', value: funnel.payments, color: '#22C55E', pct: funnel.registrations > 0 ? Math.round((funnel.payments / funnel.registrations) * 100) : 0 },
              { label: '续费', value: funnel.renewals, color: '#8B5CF6', pct: funnel.payments > 0 ? Math.round((funnel.renewals / funnel.payments) * 100) : 0 },
            ].map((stage, i) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#374151] dark:text-[#CBD5E1] font-medium">{stage.label}</span>
                  <span className="text-xs font-medium" style={{ color: stage.color }}>
                    {stage.value} {i > 0 && <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">({stage.pct}%)</span>}
                  </span>
                </div>
                <div className="h-7 rounded-lg overflow-hidden bg-[#F1F5F9] dark:bg-[#334155]">
                  <div
                    className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
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
      <div className="rounded-2xl p-5 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#374151] dark:text-[#E2E8F0]">最新收入</h2>
          <Link href="/dashboard/sales/my-commissions" className="text-[11px] text-[#F59E0B] font-medium no-underline hover:underline">查看全部 →</Link>
        </div>
        {recent_commissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F1F5F9] dark:border-[#334155]">
                  <th className="text-left py-2 text-[11px] text-[#94A3B8] dark:text-[#64748B] font-medium">日期</th>
                  <th className="text-left py-2 text-[11px] text-[#94A3B8] dark:text-[#64748B] font-medium">用户</th>
                  <th className="text-left py-2 text-[11px] text-[#94A3B8] dark:text-[#64748B] font-medium hidden sm:table-cell">产品</th>
                  <th className="text-right py-2 text-[11px] text-[#94A3B8] dark:text-[#64748B] font-medium">佣金</th>
                  <th className="text-right py-2 text-[11px] text-[#94A3B8] dark:text-[#64748B] font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {recent_commissions.map((c, i) => {
                  const st = STATUS_CFG[c.status] || STATUS_CFG.pending;
                  return (
                    <tr key={i} className="border-b border-[#F3F4F6] dark:border-[#334155]/50 last:border-0">
                      <td className="py-2.5 text-[#374151] dark:text-[#CBD5E1]">{new Date(c.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-[#F59E0B]/10 text-[#F59E0B]">
                            {(c.user_name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-[#111827] dark:text-[#F1F5F9]">{c.user_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[#64748B] dark:text-[#94A3B8] hidden sm:table-cell">{PRODUCT_LABELS[c.product] || c.product}</td>
                      <td className="py-2.5 text-right font-semibold text-[#059669] dark:text-[#34D399]">${c.amount.toFixed(2)}</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-[#6B7280] dark:text-[#64748B] py-4 text-center">暂无佣金记录</p>
        )}
      </div>

      {/* F: Quick Promo Bar — branded channel buttons */}
      <div className="rounded-2xl p-4 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] flex items-center gap-3 overflow-x-auto">
        <span className="text-xs text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">快速推广:</span>
        {QUICK_CHANNELS.map(ch => {
          const Icon = ch.icon;
          return (
            <button
              key={ch.key}
              onClick={() => copyCode(`https://koalaphd.com/?ref=${agent.referral_code}&ch=${ch.key}`, ch.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition whitespace-nowrap"
              style={{
                background: ch.color + '15',
                color: ch.color,
              }}
            >
              <Icon size={14} />
              {codeCopied === ch.key ? '已复制 ✓' : `${ch.label} 复制`}
            </button>
          );
        })}
        <Link href="/dashboard/sales/promo-center" className="ml-auto text-[11px] text-[#F59E0B] font-medium no-underline whitespace-nowrap hover:underline">
          打开推广中心 →
        </Link>
      </div>
    </div>
  );
}
