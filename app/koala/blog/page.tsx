'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Mail, PenLine, Calculator, CalendarDays, Clock } from 'lucide-react';

interface BlogPost {
  id: string;
  title_zh: string | null;
  title_en: string | null;
  excerpt_zh: string | null;
  excerpt_en: string | null;
  category: string;
  author: string;
  reading_time: number;
  published_at: string;
  cover_image_url: string | null;
  tags: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  phd_guide: 'PhD指南',
  application: '申请攻略',
  scholarship: '奖学金',
  visa: '签证攻略',
  supervisor: '导师关系',
  research: '科研方法',
  student_life: '留学生活',
  news: '行业新闻',
};

const BLOG_CTAS: Record<string, { text: string; href: string }> = {
  phd_guide: { text: '想让 Koala 帮你规划PhD？免费试试 →', href: '/koala/chat?mode=path' },
  application: { text: '想让 Koala 帮你写一封？免费试试 →', href: '/koala/chat?mode=write' },
  scholarship: { text: '查看哪些导师有经费 →', href: '/koala/professors' },
  visa: { text: '有签证问题？问问 Koala →', href: '/koala/chat' },
  supervisor: { text: '和 Koala 聊聊如何选导师 →', href: '/koala/chat?mode=path' },
  research: { text: '科研问题？让 Koala 帮你 →', href: '/koala/chat?mode=research' },
  student_life: { text: '有问题？直接问 Koala →', href: '/koala/chat' },
  news: { text: '了解最新动态对你的影响 →', href: '/koala/chat' },
};

const TOOLS_GRID = [
  { icon: Mail, title: '套磁信生成器', desc: 'AI 一键生成', href: '/koala/chat?mode=write' },
  { icon: PenLine, title: 'SOP 润色', desc: '专业表达优化', href: '/koala/chat?mode=write' },
  { icon: Calculator, title: 'GPA 换算', desc: '多体系互转', href: '/koala/tools' },
  { icon: CalendarDays, title: '截止日期追踪', desc: '不错过任何 DDL', href: '/koala/tools' },
];

const FULL_TOOLS = [
  { icon: '✉️', title: '套磁信生成器', desc: '输入教授信息和你的背景，AI 生成定制套磁信', href: '/koala/chat?mode=write', tag: '定制' },
  { icon: '✏️', title: 'SOP 润色', desc: '上传 SOP 草稿，AI 优化表达与逻辑结构', href: '/koala/chat?mode=write', tag: '免费' },
  { icon: '🧮', title: 'GPA 换算', desc: '澳洲 WAM / 4.0 / 百分制 多体系互转', href: '/koala/tools', tag: '免费' },
  { icon: '📅', title: '截止日期追踪', desc: '各校 PhD 申请时间线，不错过任何 DDL', href: '/koala/tools', tag: '免费' },
  { icon: '🔬', title: 'ARC 项目查询', desc: '搜索 ARC Discovery / Linkage 在研项目', href: '/koala/chat?mode=research', tag: '免费' },
  { icon: '📋', title: 'PhD 申请自评', desc: '评估你的背景竞争力，获取个性化建议', href: '/koala/chat?mode=path', tag: '免费' },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function BlogTab() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog?public=true&limit=10')
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const featured = posts[0];
  const listPosts = posts.slice(1);

  if (loading) {
    return (
      <div className="px-6 pt-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse" style={{ boxShadow: '0 2px 8px rgba(196,160,80,0.08)' }}>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="px-6 pt-8 text-center">
        <p className="text-gray-500">暂无文章，敬请期待</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Top CTA banner */}
      <div className="mx-6 lg:mx-0 mt-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: '#1a2332' }}>
        <span className="text-xs leading-snug" style={{ color: '#e8dcc8' }}>
          📚 看完攻略，不如直接行动
        </span>
        <a href="/koala/chat" className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full no-underline" style={{ background: '#c4a050', color: '#1a2332' }}>
          开始规划 →
        </a>
      </div>

      {/* Featured card */}
      {featured && (
        <div className="px-6 lg:px-0 pt-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 4px 16px rgba(196,160,80,0.12)' }}>
            <div
              className="relative w-full"
              style={{
                height: 160,
                background: featured.cover_image_url
                  ? `url(${featured.cover_image_url}) center/cover`
                  : 'linear-gradient(135deg, #f5d89a 0%, #e8b878 50%, #c4a050 100%)',
              }}
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(26,35,50,0) 40%, rgba(26,35,50,0.55) 100%)' }} />
              <span className="font-semibold rounded-full text-white text-xs leading-4 absolute left-3 top-3 px-2.5 py-1" style={{ background: '#c4a050' }}>
                {CATEGORY_LABELS[featured.category] || featured.category}
              </span>
              <span className="font-medium rounded-full text-xs leading-4 flex absolute right-3 top-3 px-2 py-1 items-center gap-1" style={{ background: 'rgba(255,255,255,0.85)', color: '#1a2332' }}>
                <Clock className="size-3" />
                {featured.reading_time} min
              </span>
            </div>
            <div className="flex p-4 flex-col gap-2">
              <h2 className="leading-snug font-bold text-base" style={{ color: '#1a2332' }}>
                {featured.title_zh || featured.title_en}
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                {featured.excerpt_zh || featured.excerpt_en}
              </p>
              <div className="flex pt-1 items-center gap-2">
                <div className="size-6 font-bold rounded-full text-white text-[10px] flex justify-center items-center" style={{ background: '#c4a050' }}>
                  {(featured.author || 'K')[0]}
                </div>
                <span className="text-xs" style={{ color: '#6b7280' }}>
                  {featured.author} · {timeAgo(featured.published_at)}
                </span>
              </div>
              <a
                href={BLOG_CTAS[featured.category]?.href || '/koala/chat'}
                className="mt-2 block text-center text-xs font-semibold py-2.5 rounded-xl no-underline"
                style={{ background: '#1a2332', color: '#c4a050' }}
              >
                {BLOG_CTAS[featured.category]?.text || '有问题？直接问 Koala →'}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* List posts */}
      <div className="flex px-6 lg:px-0 pt-6 flex-col gap-3 lg:grid lg:grid-cols-3">
        {listPosts.map(post => {
          const cta = BLOG_CTAS[post.category] || { text: '有问题？直接问 Koala →', href: '/koala/chat' };
          return (
            <div key={post.id} className="rounded-xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(196,160,80,0.08)' }}>
              <div className="flex items-stretch">
                <div style={{ background: '#c4a050', width: 4, flexShrink: 0 }} />
                <div className="flex p-3 flex-col flex-1 gap-1">
                  <h3 className="font-bold text-sm leading-5" style={{ color: '#1a2332' }}>{post.title_zh || post.title_en}</h3>
                  <p className="text-xs leading-4" style={{ color: '#6b7280' }}>{post.excerpt_zh || post.excerpt_en}</p>
                  <span className="text-[11px] mt-1" style={{ color: '#a89878' }}>
                    {timeAgo(post.published_at)} · {CATEGORY_LABELS[post.category] || post.category}
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
      <div className="px-6 lg:px-0 pt-8">
        <div className="flex mb-4 justify-between items-center">
          <h2 className="font-bold text-lg leading-7" style={{ color: '#1a2332' }}>工具箱</h2>
          <Link href="/koala/tools" className="font-medium text-xs leading-4 no-underline" style={{ color: '#c4a050' }}>
            查看全部
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TOOLS_GRID.map(tool => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="rounded-2xl flex p-4 flex-col gap-2 no-underline"
                style={{ background: '#fff', boxShadow: '0 2px 10px rgba(196,160,80,0.10)' }}
              >
                <div className="size-10 rounded-xl flex justify-center items-center" style={{ background: 'rgba(196,160,80,0.12)' }}>
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
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#f0e9d6', color: '#7d6340' }}>
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
      <div className="flex px-6 lg:px-0 pt-4 pb-2 justify-between items-center">
        <h1 className="font-bold text-xl leading-7" style={{ color: '#1a2332' }}>博客 &amp; 工具</h1>
        <button className="size-8 rounded-full flex justify-center items-center" style={{ background: 'rgba(196,160,80,0.12)' }}>
          <Search className="size-4" style={{ color: '#c4a050' }} />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="px-6 lg:px-0 pt-4">
        <div className="rounded-full flex p-1 items-center lg:inline-flex lg:rounded-full" style={{ background: '#f0e8d4' }}>
          <button
            onClick={() => setTab('blog')}
            className="rounded-full text-sm leading-5 py-2 flex-1 transition-colors"
            style={tab === 'blog' ? { background: '#c4a050', color: '#fff', fontWeight: 600 } : { color: '#1a2332', fontWeight: 500 }}
          >
            博客
          </button>
          <button
            onClick={() => setTab('tools')}
            className="rounded-full text-sm leading-5 py-2 flex-1 transition-colors"
            style={tab === 'tools' ? { background: '#c4a050', color: '#fff', fontWeight: 600 } : { color: '#1a2332', fontWeight: 500 }}
          >
            工具
          </button>
        </div>
      </div>

      {tab === 'blog' ? <BlogTab /> : <ToolsTab />}
    </div>
  );
}
