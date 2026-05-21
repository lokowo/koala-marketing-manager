'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StatCards {
  newRegistrations: { today: number; yesterday: number };
  activeChats: { today: number; yesterday: number };
  outreach: { today: number; yesterday: number };
  revenue: { today: number; yesterday: number };
  pendingApprovals: number;
  onlineStaff: number;
}

interface AdminWeek {
  userId: string;
  name: string;
  email: string;
  actions: Record<string, number>;
  lastActive: string;
}

interface SalesRow {
  userId: string;
  name: string;
  newRegistrations: number;
  kpiTarget: number;
  met: boolean;
  followups: number;
  scans: number;
  converted: number;
  revenue: number;
}

interface ActivityItem {
  id: string;
  action: string;
  actionCategory: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  userName: string;
  role: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  blog_generate: '文章管理',
  blog_generate_professor: '文章管理',
  professor_create: '教授管理',
  professor_delete: '教授管理',
  customer_update: '客户跟进',
  create_qrcode: '营销推广',
  admin_general: '其他',
  sales_customer: '客户管理',
  sales_outreach: '套磁信',
  sales_communication: '客户沟通',
  sales_marketing: '营销推广',
};

const ACTION_LABELS: Record<string, string> = {
  blog_generate: '生成博客',
  blog_generate_professor: '教授文章',
  professor_create: '新建教授',
  professor_delete: '删除教授',
  customer_update: '客户跟进',
  create_qrcode: '生成推广码',
  customer_registered: '客户注册',
  view_customer: '查看客户',
  generate_email_for_customer: '生成套磁信',
  add_customer_note: '客户备注',
  share_qrcode: '分享二维码',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function pctChange(today: number, yesterday: number): { text: string; color: string } {
  if (yesterday === 0 && today === 0) return { text: '', color: '#94a3b8' };
  if (yesterday === 0) return { text: '↑ 新', color: '#22c55e' };
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return { text: `↑${pct}%`, color: '#22c55e' };
  if (pct < 0) return { text: `↓${Math.abs(pct)}%`, color: '#ef4444' };
  return { text: '持平', color: '#94a3b8' };
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<{
    statCards: StatCards;
    adminTeamWeek: AdminWeek[];
    salesLeaderboard: SalesRow[];
    recentActivity: ActivityItem[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/overview').then(r => r.ok ? r.json() : null).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">加载中…</p>;

  const { statCards: s } = data;

  const cards = [
    { icon: '📥', label: '今日新注册', value: s.newRegistrations.today, ...pctChange(s.newRegistrations.today, s.newRegistrations.yesterday), href: '/dashboard/koala/users' },
    { icon: '💬', label: '今日活跃对话', value: s.activeChats.today, ...pctChange(s.activeChats.today, s.activeChats.yesterday), href: '' },
    { icon: '✉️', label: '今日套磁信', value: s.outreach.today, ...pctChange(s.outreach.today, s.outreach.yesterday), href: '' },
    { icon: '💰', label: '今日收入', value: `$${s.revenue.today}`, ...pctChange(s.revenue.today, s.revenue.yesterday), href: '' },
    { icon: '📋', label: '待审批申请', value: s.pendingApprovals, text: '', color: '#f97316', href: '/dashboard/koala/roles' },
    { icon: '👤', label: '在线员工', value: s.onlineStaff, text: '', color: '#8b5cf6', href: '' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">管理总览</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Super Admin 运营概览</p>
      </div>

      {/* 6 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map(card => {
          const inner = (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 hover:shadow-sm transition cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-2xl font-medium text-gray-900 dark:text-gray-100">{card.value}</p>
              {card.text && <p className="text-[11px] mt-1" style={{ color: card.color }}>{card.text}</p>}
            </div>
          );
          return card.href ? (
            <Link key={card.label} href={card.href} className="no-underline">{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* Admin + Sales side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Admin Team */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">👨‍💼 Admin 本周工作</h3>
            <Link href="/dashboard/koala/work-logs?role=admin" className="text-[10px] text-amber-600 no-underline hover:underline">查看全部</Link>
          </div>
          {data.adminTeamWeek.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">本周暂无记录</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                    <th className="text-left px-3 py-2 font-medium">Admin</th>
                    <th className="text-center px-2 py-2 font-medium">文章</th>
                    <th className="text-center px-2 py-2 font-medium">教授</th>
                    <th className="text-center px-2 py-2 font-medium">邮件</th>
                    <th className="text-center px-2 py-2 font-medium">其他</th>
                    <th className="text-center px-2 py-2 font-medium">总操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.adminTeamWeek.map(admin => {
                    const blogCount = (admin.actions['blog_generate'] || 0) + (admin.actions['blog_generate_professor'] || 0);
                    const profCount = (admin.actions['professor_create'] || 0) + (admin.actions['professor_delete'] || 0);
                    const emailCount = admin.actions['email_send'] || 0;
                    const total = Object.values(admin.actions).reduce((a, b) => a + b, 0);
                    const other = total - blogCount - profCount - emailCount;
                    return (
                      <tr key={admin.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2">
                          <Link href={`/dashboard/koala/work-logs/${admin.userId}?role=admin`} className="text-gray-700 dark:text-gray-300 hover:text-amber-500 no-underline font-medium">
                            {admin.name}
                          </Link>
                        </td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{blogCount || '—'}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{profCount || '—'}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{emailCount || '—'}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{other || '—'}</td>
                        <td className="text-center px-2 py-2 font-bold text-gray-800 dark:text-gray-200">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sales Leaderboard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">📊 Sales 本周业绩</h3>
            <Link href="/dashboard/koala/sales-overview" className="text-[10px] text-amber-600 no-underline hover:underline">详细</Link>
          </div>
          {data.salesLeaderboard.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">暂无销售数据</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                    <th className="text-left px-2 py-2 font-medium w-6">#</th>
                    <th className="text-left px-2 py-2 font-medium">Sales</th>
                    <th className="text-center px-2 py-2 font-medium">注册</th>
                    <th className="text-center px-2 py-2 font-medium">目标</th>
                    <th className="text-center px-2 py-2 font-medium">达标</th>
                    <th className="text-center px-2 py-2 font-medium">跟进</th>
                    <th className="text-center px-2 py-2 font-medium">收入</th>
                    <th className="text-center px-2 py-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.salesLeaderboard.map((s, i) => (
                    <tr key={s.userId} className={s.met ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/30 dark:bg-red-900/10'}>
                      <td className="px-2 py-2 text-gray-400 dark:text-gray-500 font-bold">{i + 1}</td>
                      <td className="px-2 py-2">
                        <Link href={`/dashboard/koala/work-logs/${s.userId}?role=sales`} className="text-gray-700 dark:text-gray-300 hover:text-amber-500 no-underline font-medium">
                          {s.name}
                        </Link>
                      </td>
                      <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{s.newRegistrations}</td>
                      <td className="text-center px-2 py-2 text-gray-400 dark:text-gray-500">{s.kpiTarget}</td>
                      <td className="text-center px-2 py-2">{s.met ? '🌟' : '🔴'}</td>
                      <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{s.followups}</td>
                      <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">${s.revenue}</td>
                      <td className="text-center px-2 py-2">
                        <Link href={`/dashboard/koala/work-logs/${s.userId}?role=sales`} className="text-[10px] text-amber-600 no-underline hover:underline">查看</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">最近系统动态</h3>
          <Link href="/dashboard/koala/work-logs" className="text-[10px] text-amber-600 no-underline hover:underline">全部日志</Link>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">暂无动态</p>
        ) : (
          <div className="space-y-0">
            {data.recentActivity.map(item => {
              const roleIcon = item.role === 'sales' ? '🟢' : '📝';
              const roleLabel = item.role === 'sales' ? 'Sales' : 'Admin';
              return (
                <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 w-16 flex-shrink-0 pt-0.5">{timeAgo(item.createdAt)}</span>
                  <span className="text-sm flex-shrink-0">{roleIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{roleLabel}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.userName}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{ACTION_LABELS[item.action] || item.action}</span>
                    </div>
                    {(item.targetName || item.targetType) && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        {item.targetName || item.targetType}
                        {item.targetId && ` #${item.targetId.slice(0, 8)}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
