'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { use } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface UserProfile {
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  totalActions: number;
}

interface WorkLog {
  id: string;
  action: string;
  action_category: string | null;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface WeeklySummary {
  week: string;
  categories: Record<string, number>;
  total: number;
}

interface SalesStats {
  newRegistrations: number;
  kpiTarget: number;
  met: boolean;
  scans: number;
  followups: number;
  converted: number;
  revenue: number;
  customers: { id: string; name: string; stage: string; created_at: string }[];
}

const ACTION_LABELS: Record<string, string> = {
  blog_generate: '生成博客',
  blog_generate_professor: '教授文章',
  professor_create: '创建教授',
  professor_delete: '删除教授',
  customer_update: '客户跟进',
  create_qrcode: '生成推广码',
  customer_registered: '客户注册',
  generate_email_for_customer: '套磁信',
  add_customer_note: '客户备注',
  share_qrcode: '分享二维码',
};

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const searchParams = useSearchParams();
  const roleHint = searchParams.get('role') || '';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [dailyChart, setDailyChart] = useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [userId, page]);

  async function loadData() {
    setLoading(true);
    const [profileRes, logsRes] = await Promise.all([
      fetch(`/api/admin/user-detail?userId=${userId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/admin/work-logs?userId=${userId}&page=${page}&limit=30`).then(r => r.ok ? r.json() : { data: [], total: 0 }),
    ]);

    if (profileRes) {
      setProfile(profileRes.profile);
      setWeeklySummary(profileRes.weeklySummary ?? []);
      setDailyChart(profileRes.dailyChart ?? []);
      if (profileRes.salesStats) setSalesStats(profileRes.salesStats);
    }
    setLogs(logsRes.data ?? []);
    setTotal(logsRes.total ?? 0);
    setLoading(false);
  }

  if (loading && !profile) return <p className="text-sm text-slate-400 py-8 text-center">加载中…</p>;
  if (!profile) return <p className="text-sm text-slate-400 py-8 text-center">用户未找到</p>;

  const isSales = roleHint === 'sales' || profile.role === 'sales';
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/koala/work-logs" className="text-xs text-amber-600 no-underline hover:underline">← 返回工作日志</Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
          {(profile.display_name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">{profile.display_name || profile.email}</h1>
          <p className="text-xs text-slate-500">{profile.email}</p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isSales ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {isSales ? 'Sales' : 'Admin'}
          </span>
          <p className="text-xs text-slate-400 mt-1">总操作 {profile.totalActions}</p>
        </div>
      </div>

      {/* Sales-specific stats */}
      {isSales && salesStats && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">本周业绩</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
            {[
              { label: '新注册', value: salesStats.newRegistrations, sub: `目标 ${salesStats.kpiTarget}` },
              { label: '达标', value: salesStats.met ? '✅' : '❌', sub: '' },
              { label: '扫码数', value: salesStats.scans, sub: '' },
              { label: '跟进', value: salesStats.followups, sub: '' },
              { label: '收入', value: `$${salesStats.revenue}`, sub: '' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-xl font-bold text-slate-800">{item.value}</p>
                <p className="text-[10px] text-slate-500">{item.label}</p>
                {item.sub && <p className="text-[10px] text-slate-400">{item.sub}</p>}
              </div>
            ))}
          </div>
          {salesStats.customers.length > 0 && (
            <>
              <h4 className="text-xs font-medium text-slate-500 mb-2">客户列表</h4>
              <div className="space-y-1.5">
                {salesStats.customers.map(c => (
                  <Link key={c.id} href={`/dashboard/sales/customer/${c.id}`} className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-50 no-underline hover:bg-slate-100 text-xs">
                    <span className="text-slate-700">{c.name}</span>
                    <span className="text-[10px] text-slate-400">{c.stage}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Daily chart */}
      {dailyChart.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">本周工作统计</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="操作数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly summary */}
      {weeklySummary.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">按周汇总</h3>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="text-left px-3 py-2 font-medium">周</th>
                  {isSales ? (
                    <>
                      <th className="text-center px-2 py-2 font-medium">注册</th>
                      <th className="text-center px-2 py-2 font-medium">跟进</th>
                      <th className="text-center px-2 py-2 font-medium">套磁信</th>
                      <th className="text-center px-2 py-2 font-medium">收入</th>
                    </>
                  ) : (
                    <>
                      <th className="text-center px-2 py-2 font-medium">文章</th>
                      <th className="text-center px-2 py-2 font-medium">教授</th>
                      <th className="text-center px-2 py-2 font-medium">邮件</th>
                      <th className="text-center px-2 py-2 font-medium">用户</th>
                    </>
                  )}
                  <th className="text-center px-2 py-2 font-medium">总计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeklySummary.map(w => (
                  <tr key={w.week} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{w.week}</td>
                    {isSales ? (
                      <>
                        <td className="text-center px-2 py-2 text-slate-600">{w.categories['customer_registered'] || 0}</td>
                        <td className="text-center px-2 py-2 text-slate-600">{w.categories['customer_update'] || 0}</td>
                        <td className="text-center px-2 py-2 text-slate-600">{w.categories['generate_email_for_customer'] || 0}</td>
                        <td className="text-center px-2 py-2 text-slate-600">$0</td>
                      </>
                    ) : (
                      <>
                        <td className="text-center px-2 py-2 text-slate-600">{(w.categories['blog_generate'] || 0) + (w.categories['blog_generate_professor'] || 0)}</td>
                        <td className="text-center px-2 py-2 text-slate-600">{(w.categories['professor_create'] || 0) + (w.categories['professor_delete'] || 0)}</td>
                        <td className="text-center px-2 py-2 text-slate-600">{w.categories['email_send'] || 0}</td>
                        <td className="text-center px-2 py-2 text-slate-600">{w.categories['user_management'] || 0}</td>
                      </>
                    )}
                    <td className="text-center px-2 py-2 font-bold text-slate-800">{w.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">完整日志</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="text-left px-4 py-2.5 font-medium w-[130px]">时间</th>
              <th className="text-left px-4 py-2.5 font-medium">操作</th>
              <th className="text-left px-4 py-2.5 font-medium">目标</th>
              <th className="text-center px-4 py-2.5 font-medium w-[50px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(log => (
              <React.Fragment key={log.id}>
                <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{log.target_name || log.target_type}{log.target_id && !log.target_name ? ` #${log.target_id.slice(0, 8)}` : ''}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block transition-transform ${expandedId === log.id ? 'rotate-90' : ''}`}>▶</span>
                  </td>
                </tr>
                {expandedId === log.id && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 bg-slate-50">
                      <pre className="p-2 rounded bg-white border border-slate-200 text-[10px] text-slate-600 overflow-auto max-h-[200px] whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs rounded bg-white border border-slate-200 disabled:opacity-50">上一页</button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs rounded bg-white border border-slate-200 disabled:opacity-50">下一页</button>
        </div>
      )}
    </div>
  );
}
