'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<AnyObj | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${range}`)
      .then(r => r.ok ? r.json() : {})
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">数据分析</h2>
          <p className="text-sm text-slate-500 mt-0.5">平台运营数据概览</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { days: 7, label: '7天' },
            { days: 30, label: '30天' },
            { days: 90, label: '90天' },
          ].map(o => (
            <button
              key={o.days}
              onClick={() => setRange(o.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                range === o.days ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">加载中...</div>
      ) : (
        <>
          {/* User growth */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">用户增长</h3>
            {(data?.userGrowth || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data?.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} name="新注册" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-slate-300">暂无数据</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top professors */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">热门教授 (被收藏最多)</h3>
              {(data?.topProfessors || []).length > 0 ? (
                <div className="space-y-2">
                  {data!.topProfessors.map((p: AnyObj, i: number) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <Link href={`/dashboard/koala/professors/${p.id}`} className="text-sm text-slate-800 hover:text-blue-600 no-underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-slate-400">{p.university}</p>
                      </div>
                      <span className="text-xs font-medium text-amber-600">{p.savedCount} 收藏</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-300 py-8 text-center">暂无数据 (需要 saved_professors 表)</p>
              )}
            </div>

            {/* Top blogs */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">博客热门文章</h3>
              {(data?.topBlogs || []).length > 0 ? (
                <div className="space-y-2">
                  {data!.topBlogs.map((b: AnyObj, i: number) => (
                    <div key={b.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-800 truncate block">{b.title_zh || 'Untitled'}</span>
                        <span className="text-xs text-slate-400">{b.category}</span>
                      </div>
                      <span className="text-xs font-medium text-blue-600">{b.view_count ?? 0} 浏览</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-300 py-8 text-center">暂无数据</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
