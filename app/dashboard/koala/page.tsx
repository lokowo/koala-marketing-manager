'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Stats {
  users: { total: number; today: number };
  professors: number;
  knowledgeChunks: number;
  blog: { published: number; draft: number };
  chat: { today: number; month: number };
  outreach: { today: number; month: number };
  pendingApprovals: number;
  onlineAdmins: number;
  adminTeamWeek: AdminWeek[];
  recentActivity: ActivityItem[];
}

interface AdminWeek {
  userId: string;
  name: string;
  email: string;
  actions: Record<string, number>;
}

interface ActivityItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  userName: string;
}

interface TrendPoint { date: string; chats: number; outreach: number }

interface SalesUser {
  userId: string;
  profile: { display_name: string; email: string };
  totalCustomers: number;
  converted: number;
  conversionRate: string;
  qrcodeCount: number;
  totalScans: number;
}

interface KPI { weekly_new_leads: number; weekly_conversions: number; monthly_revenue_target: number }

const ACTION_LABELS: Record<string, string> = {
  blog_generate: '生成博客',
  blog_generate_professor: '教授文章',
  professor_create: '新建教授',
  professor_delete: '删除教授',
  customer_update: '客户跟进',
};

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

export default function KoalaDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [salesData, setSalesData] = useState<{ perSales: SalesUser[]; kpi: KPI | null }>({ perSales: [], kpi: null });

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats);
    fetch('/api/admin/stats/trend').then(r => r.ok ? r.json() : { data: [] }).then(d => setTrend(d.data || []));

    Promise.all([
      fetch('/api/admin/sales-overview').then(r => r.ok ? r.json() : { perSales: [] }),
      fetch('/api/admin/kpi').then(r => r.ok ? r.json() : { kpi: null }),
    ]).then(([overview, kpiData]: [{ perSales: SalesUser[] }, { kpi: KPI | null }]) => {
      setSalesData({ perSales: overview.perSales ?? [], kpi: kpiData.kpi ?? null });
    }).catch(() => {});
  }, []);

  const STAT_CARDS = [
    { icon: '📥', label: '今日注册', value: stats?.users.today ?? '—', sub: `总 ${stats?.users.total?.toLocaleString() ?? '—'}`, color: '#3b82f6' },
    { icon: '💬', label: '今日活跃对话', value: stats?.chat.today ?? '—', sub: `本月 ${stats?.chat.month ?? 0}`, color: '#f59e0b' },
    { icon: '✉️', label: '今日套磁信', value: stats?.outreach.today ?? '—', sub: `本月 ${stats?.outreach.month ?? 0}`, color: '#ef4444' },
    { icon: '💰', label: '本月收入', value: '—', sub: '功能开发中', color: '#10b981' },
    { icon: '📋', label: '待审批', value: stats?.pendingApprovals ?? '—', sub: '', color: '#f97316', href: '/dashboard/koala/roles' },
    { icon: '👤', label: '在线 Admin', value: stats?.onlineAdmins ?? '—', sub: '', color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">管理总览</h2>
        <p className="text-sm text-slate-500 mt-1">Koala PhD 运营概览</p>
      </div>

      {/* 6 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(card => {
          const inner = (
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              {card.sub && <p className="text-[11px] text-slate-400 mt-1">{card.sub}</p>}
            </div>
          );
          return card.href ? (
            <Link key={card.label} href={card.href} className="no-underline">{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">近 30 天趋势</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} labelStyle={{ fontWeight: 600 }} />
                <Line type="monotone" dataKey="chats" stroke="#f59e0b" strokeWidth={2} dot={false} name="AI对话" />
                <Line type="monotone" dataKey="outreach" stroke="#ef4444" strokeWidth={2} dot={false} name="申请信" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-slate-300">加载中...</div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">快捷操作</h3>
          <div className="space-y-2">
            {[
              { label: 'AI 生成文章', href: '/dashboard/koala/ai-content', icon: '✨' },
              { label: '博客管理', href: '/dashboard/koala/blog', icon: '📝' },
              { label: '教授库', href: '/dashboard/koala/professors', icon: '👨‍🏫' },
              { label: '用户管理', href: '/dashboard/koala/users', icon: '👥' },
              { label: '角色管理', href: '/dashboard/koala/roles', icon: '🔐' },
              { label: 'KPI 设置', href: '/dashboard/koala/kpi', icon: '🎯' },
            ].map(a => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition text-sm text-slate-700 no-underline">
                <span className="text-lg">{a.icon}</span>
                <span>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Admin team week + Sales leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Admin Team */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Admin 团队本周工作</h3>
            <Link href="/dashboard/koala/work-logs" className="text-[10px] text-amber-600 no-underline hover:underline">查看全部</Link>
          </div>
          {(stats?.adminTeamWeek ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">本周暂无记录</p>
          ) : (
            <div className="space-y-2.5">
              {(stats?.adminTeamWeek ?? []).map(admin => {
                const total = Object.values(admin.actions).reduce((a, b) => a + b, 0);
                return (
                  <div key={admin.userId} className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                      {(admin.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700 truncate">{admin.name}</span>
                        <span className="text-[10px] font-bold text-slate-500">{total} 次操作</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(admin.actions).map(([action, count]) => (
                          <span key={action} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">
                            {ACTION_LABELS[action] || action} {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales Leaderboard */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Sales 业绩排行</h3>
            <Link href="/dashboard/koala/sales-overview" className="text-[10px] text-amber-600 no-underline hover:underline">详细</Link>
          </div>
          {salesData.perSales.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">暂无销售数据</p>
          ) : (
            <div className="space-y-2">
              {[...salesData.perSales]
                .sort((a, b) => b.converted - a.converted || b.totalCustomers - a.totalCustomers)
                .map((s, i) => {
                  const target = salesData.kpi?.weekly_conversions ?? 2;
                  const met = s.converted >= target;
                  return (
                    <div key={s.userId} className="flex items-center gap-3 py-1.5">
                      <span className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-slate-700 truncate block">{s.profile.display_name || s.profile.email}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">{s.converted}</span>
                        <span className="text-[10px] text-slate-400">/{s.totalCustomers}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        met ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'
                      }`}>
                        {met ? '达标' : '未达标'}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Recent 20 system events */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">最近系统动态</h3>
          <Link href="/dashboard/koala/work-logs" className="text-[10px] text-amber-600 no-underline hover:underline">全部日志</Link>
        </div>
        {(stats?.recentActivity ?? []).length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">暂无动态</p>
        ) : (
          <div className="space-y-0">
            {(stats?.recentActivity ?? []).map(item => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="mt-0.5 size-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">{item.userName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {ACTION_LABELS[item.action] || item.action}
                    </span>
                    {item.targetType && (
                      <span className="text-[10px] text-slate-400">{item.targetType}</span>
                    )}
                  </div>
                  {item.details && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {(item.details as Record<string, unknown>).name as string || (item.details as Record<string, unknown>).topic as string || (item.details as Record<string, unknown>).profName as string || ''}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
