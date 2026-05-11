'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SurveyStats {
  total: number;
  active: number;
  responses: number;
}

const tools = [
  {
    id: 'surveys',
    icon: '📋',
    title: '调研问卷',
    subtitle: 'Survey Tools',
    description: '创建调研问卷，通过销售推广获取潜在客户数据',
    href: '/dashboard/koala/surveys',
    available: true,
  },
  {
    id: 'events',
    icon: '📅',
    title: '活动管理',
    subtitle: 'Event Management',
    description: '组织线上线下活动，追踪报名和参与',
    href: '#',
    available: false,
  },
  {
    id: 'content',
    icon: '✍️',
    title: '内容营销',
    subtitle: 'Content Marketing',
    description: '管理博客文章、社交媒体内容和 SEO 优化',
    href: '#',
    available: false,
  },
  {
    id: 'insights',
    icon: '📊',
    title: '数据洞察',
    subtitle: 'Data Insights',
    description: '跨渠道数据分析，用户画像和转化追踪',
    href: '#',
    available: false,
  },
];

export default function MarketingToolsPage() {
  const [stats, setStats] = useState<SurveyStats>({ total: 0, active: 0, responses: 0 });

  useEffect(() => {
    fetch('/api/surveys')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.surveys) {
          const surveys = data.surveys as { status: string }[];
          setStats({
            total: surveys.length,
            active: surveys.filter((s) => s.status === 'active').length,
            responses: 0,
          });
        }
      })
      .catch(() => {});

    fetch('/api/surveys/responses-count')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.count !== undefined) {
          setStats(prev => ({ ...prev, responses: data.count }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 text-slate-900">营销工具</h1>
        <p className="text-sm text-slate-500 mt-1">
          管理调研问卷、推广活动等营销工具
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {tools.map((tool) =>
          tool.available ? (
            <Link
              key={tool.id}
              href={tool.href}
              className="group relative block rounded-xl border border-amber-500/30 bg-white p-6 no-underline transition-all hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
            >
              <div className="absolute top-0 left-6 w-10 h-1 rounded-b bg-gradient-to-r from-amber-400 to-teal-400" />
              <div className="flex items-start gap-4">
                <span className="text-2xl">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 text-slate-900">{tool.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 text-emerald-600">
                      可用 ✅
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{tool.subtitle}</p>
                  <p className="text-sm text-slate-600 mt-2">{tool.description}</p>

                  <div className="flex gap-4 mt-4 text-xs text-slate-500">
                    <span><strong className="text-slate-700">{stats.total}</strong> 份问卷</span>
                    <span><strong className="text-slate-700">{stats.active}</strong> 活跃中</span>
                    <span><strong className="text-slate-700">{stats.responses}</strong> 份回复</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-5 right-5 text-slate-300 group-hover:text-amber-400 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            </Link>
          ) : (
            <div
              key={tool.id}
              className="relative rounded-xl border border-slate-200 bg-white/50 p-6 opacity-50 cursor-not-allowed"
            >
              <span className="absolute top-4 right-4 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Coming Soon 🔜
              </span>
              <div className="flex items-start gap-4">
                <span className="text-2xl grayscale">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-600">{tool.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{tool.subtitle}</p>
                  <p className="text-sm text-slate-500 mt-2">{tool.description}</p>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <p className="text-center text-xs text-slate-400 mt-10">
        更多营销工具正在开发中，敬请期待
      </p>
    </div>
  );
}
