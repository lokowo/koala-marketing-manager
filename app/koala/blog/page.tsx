'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Mail, PenLine, Calculator, CalendarDays, Clock } from 'lucide-react';

const FEATURED_POST = {
  id: 'outreach-email-guide',
  tag: '申请技巧',
  readMin: 8,
  title: '如何写出打动教授的套磁信',
  excerpt: '从研究兴趣切入，三步法精准匹配教授方向，提升回复率。',
  author: '李学姐',
  authorInitial: 'L',
  daysAgo: '2天前',
};

const LIST_POSTS = [
  {
    id: 'school-selection',
    title: '美研选校：冲稳保的黄金比例',
    excerpt: '用数据告诉你如何科学搭配选校名单。',
    date: '10月12日',
    category: '文书',
  },
  {
    id: 'interview-top20',
    title: '面试常见问题 Top 20 解析',
    excerpt: '覆盖 PhD 面试核心套路与应对话术。',
    date: '10月08日',
    category: '面试',
  },
  {
    id: 'scholarship-hidden',
    title: '奖学金申请的隐藏机会',
    excerpt: '盘点容易被忽视的资助渠道与时间节点。',
    date: '10月03日',
    category: '奖学金',
  },
];

const TOOLS_GRID = [
  { icon: Mail,         title: '套磁信生成器', desc: 'AI 一键生成',    href: '/koala/chat?mode=write' },
  { icon: PenLine,      title: 'SOP 润色',     desc: '专业表达优化',   href: '/koala/chat?mode=write' },
  { icon: Calculator,   title: 'GPA 换算',     desc: '多体系互转',     href: '/koala/tools' },
  { icon: CalendarDays, title: '截止日期追踪',  desc: '不错过任何 DDL', href: '/koala/tools' },
];

const FULL_TOOLS = [
  { icon: '✉️', title: '套磁信生成器', desc: '输入教授信息和你的背景，AI 生成定制套磁信', href: '/koala/chat?mode=write', tag: '定制' },
  { icon: '✏️', title: 'SOP 润色',    desc: '上传 SOP 草稿，AI 优化表达与逻辑结构',     href: '/koala/chat?mode=write', tag: '免费' },
  { icon: '🧮', title: 'GPA 换算',    desc: '澳洲 WAM / 4.0 / 百分制 多体系互转',       href: '/koala/tools',          tag: '免费' },
  { icon: '📅', title: '截止日期追踪', desc: '各校 PhD 申请时间线，不错过任何 DDL',       href: '/koala/tools',          tag: '免费' },
  { icon: '🔬', title: 'ARC 项目查询', desc: '搜索 ARC Discovery / Linkage 在研项目',   href: '/koala/chat?mode=research', tag: '免费' },
  { icon: '📋', title: 'PhD 申请自评', desc: '评估你的背景竞争力，获取个性化建议',       href: '/koala/chat?mode=path',    tag: '免费' },
];

const BLOG_CTAS: Record<string, { text: string; href: string }> = {
  '申请技巧': { text: '想让 Koala 帮你写一封？免费试试 →', href: '/koala/chat?mode=write' },
  '文书':     { text: '想让 Koala 帮你写一封？免费试试 →', href: '/koala/chat?mode=write' },
  '选校攻略': { text: '告诉 Koala 你的背景，AI 帮你选校 →', href: '/koala/chat?mode=path' },
  '面试':     { text: '和 Koala 模拟一次 PhD 面试 →', href: '/koala/chat' },
  '奖学金':   { text: '查看哪些导师有经费，增加奖学金机会 →', href: '/koala/professors' },
};

function getBlogCta(category: string): { text: string; href: string } {
  return BLOG_CTAS[category] ?? { text: '有问题？直接问 Koala →', href: '/koala/chat' };
}

function BlogTab() {
  return (
    <div className="pb-4">
      {/* Top CTA banner */}
      <div className="mx-6 mt-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: '#1a2332' }}>
        <span className="text-xs leading-snug" style={{ color: '#e8dcc8' }}>
          📚 看完攻略，不如直接行动
        </span>
        <a
          href="/koala/chat"
          className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full no-underline"
          style={{ background: '#c4a050', color: '#1a2332' }}
        >
          开始规划 →
        </a>
      </div>

      {/* Featured card */}
      <div className="px-6 pt-4">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', boxShadow: '0 4px 16px rgba(196,160,80,0.12)' }}
        >
          <div
            className="relative w-full"
            style={{
              height: 160,
              background: 'linear-gradient(135deg, #f5d89a 0%, #e8b878 50%, #c4a050 100%)',
            }}
          >
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3C/svg%3E")`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(26,35,50,0) 40%, rgba(26,35,50,0.55) 100%)' }}
            />
            <span
              className="font-semibold rounded-full text-white text-xs leading-4 absolute left-3 top-3 px-2.5 py-1"
              style={{ background: '#c4a050' }}
            >
              {FEATURED_POST.tag}
            </span>
            <span
              className="font-medium rounded-full text-xs leading-4 flex absolute right-3 top-3 px-2 py-1 items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.85)', color: '#1a2332' }}
            >
              <Clock className="size-3" />
              {FEATURED_POST.readMin} min
            </span>
          </div>
          <div className="flex p-4 flex-col gap-2">
            <h2 className="leading-snug font-bold text-base leading-6" style={{ color: '#1a2332' }}>
              {FEATURED_POST.title}
            </h2>
            <p className="leading-relaxed text-xs leading-4" style={{ color: '#6b7280' }}>
              {FEATURED_POST.excerpt}
            </p>
            <div className="flex pt-1 items-center gap-2">
              <div
                className="size-6 font-bold rounded-full text-white text-[10px] flex justify-center items-center"
                style={{ background: '#c4a050' }}
              >
                {FEATURED_POST.authorInitial}
              </div>
              <span className="text-xs leading-4" style={{ color: '#6b7280' }}>
                {FEATURED_POST.author} · {FEATURED_POST.daysAgo}
              </span>
            </div>
            <a
              href={getBlogCta(FEATURED_POST.tag).href}
              className="mt-2 block text-center text-xs font-semibold py-2.5 rounded-xl no-underline"
              style={{ background: '#1a2332', color: '#c4a050' }}
            >
              {getBlogCta(FEATURED_POST.tag).text}
            </a>
          </div>
        </div>
      </div>

      {/* List posts */}
      <div className="flex px-6 pt-6 flex-col gap-3">
        {LIST_POSTS.map(post => {
          const cta = getBlogCta(post.category);
          return (
          <div
            key={post.id}
            className="rounded-xl overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 2px 8px rgba(196,160,80,0.08)' }}
          >
            <div className="flex items-stretch">
              <div style={{ background: '#c4a050', width: 4, flexShrink: 0 }} />
              <div className="flex p-3 flex-col flex-1 gap-1">
                <h3 className="font-bold text-sm leading-5" style={{ color: '#1a2332' }}>{post.title}</h3>
                <p className="text-xs leading-4" style={{ color: '#6b7280' }}>{post.excerpt}</p>
                <span className="text-[11px] mt-1" style={{ color: '#a89878' }}>
                  {post.date} · {post.category}
                </span>
              </div>
            </div>
            <a
              href={cta.href}
              className="block text-center text-[11px] font-medium py-2 no-underline"
              style={{ background: '#f5edd8', color: '#7d6340', borderTop: '1px solid #f0e8d4' }}
            >
              {cta.text}
            </a>
          </div>
          );
        })}
      </div>

      {/* Tool grid */}
      <div className="px-6 pt-8">
        <div className="flex mb-4 justify-between items-center">
          <h2 className="font-bold text-lg leading-7" style={{ color: '#1a2332' }}>工具箱</h2>
          <Link href="/koala/tools" className="font-medium text-xs leading-4 no-underline" style={{ color: '#c4a050' }}>
            查看全部
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TOOLS_GRID.map(tool => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="rounded-2xl flex p-4 flex-col gap-2 no-underline"
                style={{ background: '#fff', boxShadow: '0 2px 10px rgba(196,160,80,0.10)' }}
              >
                <div
                  className="size-10 rounded-xl flex justify-center items-center"
                  style={{ background: 'rgba(196,160,80,0.12)' }}
                >
                  <Icon className="size-5" style={{ color: '#c4a050' }} />
                </div>
                <span className="font-bold text-sm leading-5" style={{ color: '#1a2332' }}>{tool.title}</span>
                <span className="text-[11px]" style={{ color: '#6b7280' }}>{tool.desc}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ToolsTab() {
  return (
    <div className="px-4 py-4 pb-6 space-y-2.5">
      {FULL_TOOLS.map(tool => (
        <Link
          key={tool.title}
          href={tool.href}
          className="flex items-center gap-3 rounded-2xl p-4 no-underline"
          style={{ background: '#fff', boxShadow: '0 2px 8px rgba(196,160,80,0.08)', border: '1px solid #f0e8d4' }}
        >
          <span className="text-2xl flex-shrink-0">{tool.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#1a2332' }}>{tool.title}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: '#f0e9d6', color: '#7d6340' }}
              >
                {tool.tag}
              </span>
            </div>
            <div className="text-xs mt-0.5 truncate" style={{ color: '#907858' }}>{tool.desc}</div>
          </div>
          <svg className="size-4 flex-shrink-0" style={{ color: '#c0a878' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ))}
    </div>
  );
}

export default function BlogToolsPage() {
  const [tab, setTab] = useState<'blog' | 'tools'>('blog');

  return (
    <div style={{ background: '#faf6ec', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div className="flex px-6 pt-4 pb-2 justify-between items-center">
        <div style={{ width: 32 }} />
        <h1 className="font-bold text-xl leading-7" style={{ color: '#1a2332' }}>博客 &amp; 工具</h1>
        <button
          className="size-8 rounded-full flex justify-center items-center"
          style={{ background: 'rgba(196,160,80,0.12)' }}
        >
          <Search className="size-4" style={{ color: '#c4a050' }} />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="px-6 pt-4">
        <div className="rounded-full flex p-1 items-center" style={{ background: '#f0e8d4' }}>
          <button
            onClick={() => setTab('blog')}
            className="rounded-full text-sm leading-5 py-2 flex-1 transition-colors"
            style={
              tab === 'blog'
                ? { background: '#c4a050', color: '#fff', fontWeight: 600 }
                : { color: '#1a2332', fontWeight: 500 }
            }
          >
            博客
          </button>
          <button
            onClick={() => setTab('tools')}
            className="rounded-full text-sm leading-5 py-2 flex-1 transition-colors"
            style={
              tab === 'tools'
                ? { background: '#c4a050', color: '#fff', fontWeight: 600 }
                : { color: '#1a2332', fontWeight: 500 }
            }
          >
            工具
          </button>
        </div>
      </div>

      {tab === 'blog' ? <BlogTab /> : <ToolsTab />}
    </div>
  );
}
