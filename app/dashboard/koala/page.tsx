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
}

interface TrendPoint { date: string; chats: number; outreach: number }

const STAT_CARDS = [
  { key: 'users', icon: '👥', label: '注册用户', color: '#3b82f6' },
  { key: 'professors', icon: '👨\u200D🏫', label: '教授总数', color: '#8b5cf6' },
  { key: 'chat', icon: '💬', label: 'AI 对话', color: '#f59e0b' },
  { key: 'outreach', icon: '✉️', label: '申请信', color: '#ef4444' },
  { key: 'blog', icon: '📝', label: '博客文章', color: '#10b981' },
];

export default function KoalaDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats);
    fetch('/api/admin/stats/trend').then(r => r.ok ? r.json() : { data: [] }).then(d => setTrend(d.data || []));
  }, []);

  function cardValue(key: string) {
    if (!stats) return { value: '—', sub: '' };
    switch (key) {
      case 'users': return { value: stats.users.total.toLocaleString(), sub: `今日 +${stats.users.today}` };
      case 'professors': return { value: stats.professors.toLocaleString(), sub: `${stats.knowledgeChunks} 知识块` };
      case 'chat': return { value: stats.chat.month.toLocaleString(), sub: `今日 ${stats.chat.today}` };
      case 'outreach': return { value: stats.outreach.month.toLocaleString(), sub: `今日 ${stats.outreach.today}` };
      case 'blog': return { value: (stats.blog.published + stats.blog.draft).toLocaleString(), sub: `发布 ${stats.blog.published} / 草稿 ${stats.blog.draft}` };
      default: return { value: '—', sub: '' };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">仪表盘</h2>
        <p className="text-sm text-slate-500 mt-1">Koala PhD 运营概览</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {STAT_CARDS.map(card => {
          const { value, sub } = cardValue(card.key);
          return (
            <div key={card.key} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts + Quick actions */}
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
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="chats" stroke="#f59e0b" strokeWidth={2} dot={false} name="AI对话" />
                <Line type="monotone" dataKey="outreach" stroke="#ef4444" strokeWidth={2} dot={false} name="申请信" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-slate-300">
              加载中...
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">快捷操作</h3>
          <div className="space-y-2">
            {[
              { label: 'AI 生成文章', href: '/dashboard/koala/ai-content', icon: '✨' },
              { label: '博客管理', href: '/dashboard/koala/blog', icon: '📝' },
              { label: '教授库', href: '/dashboard/koala/professors', icon: '👨\u200D🏫' },
              { label: '数据质量', href: '/dashboard/koala/professors/quality', icon: '🔍' },
              { label: '用户管理', href: '/dashboard/koala/users', icon: '👥' },
              { label: '数据分析', href: '/dashboard/koala/analytics', icon: '📈' },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition text-sm text-slate-700 no-underline"
              >
                <span className="text-lg">{a.icon}</span>
                <span>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Data quality warnings + system status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">数据质量</h3>
          <div className="space-y-2">
            <Link href="/dashboard/koala/professors/quality" className="flex items-center justify-between py-2 border-b border-slate-50 no-underline group">
              <span className="text-sm text-slate-600 group-hover:text-slate-800">缺失邮箱教授</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">待检查</span>
            </Link>
            <Link href="/dashboard/koala/professors/quality" className="flex items-center justify-between py-2 border-b border-slate-50 no-underline group">
              <span className="text-sm text-slate-600 group-hover:text-slate-800">缺失简介教授</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">待检查</span>
            </Link>
            <Link href="/dashboard/koala/professors/quality" className="flex items-center justify-between py-2 no-underline group">
              <span className="text-sm text-slate-600 group-hover:text-slate-800">无论文记录教授</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">待检查</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">系统状态</h3>
          <div className="space-y-2">
            {[
              { label: 'AI 服务 (Claude)', status: '正常', ok: true },
              { label: '数据库 (Supabase)', status: '正常', ok: true },
              { label: '知识库', status: stats ? `${stats.knowledgeChunks} chunks` : '—', ok: true },
              { label: '教授覆盖', status: stats ? `${stats.professors} 位` : '—', ok: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-600">{s.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
