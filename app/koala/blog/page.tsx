'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';

interface BlogPost {
  id: string;
  title_zh: string | null;
  title_en: string | null;
  excerpt_zh: string | null;
  excerpt_en: string | null;
  category: string;
  author: string;
  reading_time_zh: number;
  published_at: string;
  cover_image_url: string | null;
  tags: string[];
  view_count?: number;
}

function getSourceLabel(category: string): string {
  if (category === 'news') return '综合报道';
  if (category === 'professor_spotlight') return 'Koala PhD · 教授推荐';
  return 'Koala PhD';
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'phd_guide', label: 'PhD指南' },
  { key: 'application', label: '申请攻略' },
  { key: 'scholarship', label: '奖学金' },
  { key: 'visa', label: '签证攻略' },
  { key: 'supervisor', label: '导师关系' },
  { key: 'research', label: '科研方法' },
  { key: 'student_life', label: '留学生活' },
  { key: 'news', label: '行业新闻' },
  { key: 'professor_spotlight', label: '教授推荐' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter(c => c.key !== 'all').map(c => [c.key, c.label])
);

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const params = new URLSearchParams({ public: 'true', limit: '30' });
    if (activeCategory !== 'all') params.set('category', activeCategory);

    setLoading(true);
    fetch(`/api/blog?${params}`)
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div style={{ background: '#080c10', minHeight: '100vh', paddingBottom: 100 }}>
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h1 className="text-xl font-bold" style={{ color: '#e8e4dc' }}>博客</h1>
        </div>

        {/* Category Pills */}
        <div className="px-5 pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 whitespace-nowrap">
            {CATEGORIES.map(cat => {
              const active = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={active
                    ? { background: '#c9a96e', color: '#080c10' }
                    : { background: 'rgba(201,169,110,0.06)', color: '#a8b8ac' }
                  }
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="px-5 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'linear-gradient(180deg, #111c28, #0d1520)', border: '1px solid rgba(201,169,110,0.08)' }}>
                <div className="flex gap-3 md:flex-col">
                  <div className="w-20 h-20 md:w-full md:h-[200px] rounded-xl flex-shrink-0" style={{ background: 'rgba(201,169,110,0.08)' }} />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 rounded w-3/4" style={{ background: 'rgba(201,169,110,0.08)' }} />
                    <div className="h-3 rounded w-full" style={{ background: 'rgba(201,169,110,0.05)' }} />
                    <div className="h-3 rounded w-1/2" style={{ background: 'rgba(201,169,110,0.05)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && posts.length === 0 && (
          <div className="px-5 pt-12 text-center">
            <p className="text-sm" style={{ color: '#6a7a7e' }}>暂无文章</p>
          </div>
        )}

        {/* Article List */}
        {!loading && posts.length > 0 && (
          <div className="px-5 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/koala/blog/${post.id}`}
                className="blog-card block rounded-2xl no-underline transition-all active:scale-[0.98] overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #111c28, #0d1520)',
                  border: '1px solid rgba(201,169,110,0.08)',
                  borderRadius: 16,
                }}
              >
                {/* Desktop: top cover image */}
                <div
                  className="hidden md:block w-full h-[200px]"
                  style={{
                    background: post.cover_image_url
                      ? `url(${post.cover_image_url}) center/cover`
                      : 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))',
                    borderRadius: '12px 12px 0 0',
                  }}
                />

                <div className="p-3.5">
                  <div className="flex gap-3 md:flex-col md:gap-2">
                    {/* Mobile: left thumbnail */}
                    <div
                      className="w-20 h-20 rounded-xl flex-shrink-0 md:hidden"
                      style={{
                        background: post.cover_image_url
                          ? `url(${post.cover_image_url}) center/cover`
                          : 'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05))',
                        border: '1px solid rgba(201,169,110,0.06)',
                      }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 md:py-0 md:gap-2">
                      {/* Top: category + reading time */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
                          {CATEGORY_LABELS[post.category] || post.category}
                        </span>
                        <span className="text-[11px] flex items-center gap-0.5" style={{ color: '#6a7a7e' }}>
                          <Clock className="size-3" />
                          {post.reading_time_zh} min
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: '#e8e4dc' }}>
                        {post.title_zh || post.title_en}
                      </h3>

                      {/* Desktop: excerpt */}
                      {(post.excerpt_zh || post.excerpt_en) && (
                        <p className="hidden md:block text-xs leading-relaxed line-clamp-2" style={{ color: '#6a7a7e' }}>
                          {post.excerpt_zh || post.excerpt_en}
                        </p>
                      )}

                      {/* Bottom: source + date + views */}
                      <div className="flex items-center gap-1.5">
                        <div className="size-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: '#c9a96e' }}>
                          {(post.author || 'K')[0]}
                        </div>
                        <span className="text-[11px]" style={{ color: '#6a7a7e' }}>
                          {getSourceLabel(post.category)} · {timeAgo(post.published_at)}
                          {post.view_count ? ` · 👁 ${post.view_count}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `.blog-card:hover { border-color: rgba(201,169,110,0.2) !important; }` }} />
    </div>
  );
}
