'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function getSourceLabel(category: string): string {
  if (category === 'news') return '综合报道';
  if (category === 'professor_spotlight') return '教授推荐';
  return 'Koala PhD';
}

const PAGE_SIZE = 9;

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'hot'>('date');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ public: 'true', limit: String(PAGE_SIZE), page: String(page) });
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (search) params.set('search', search);
    params.set('sort', sortBy === 'hot' ? 'hot' : 'date');

    setLoading(true);
    fetch(`/api/blog?${params}`)
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
        setTotal(data.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeCategory, search, sortBy, page]);

  function doSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ background: '#080c10', minHeight: '100vh', paddingBottom: 100 }}>
      <div className="max-w-[1080px] mx-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-1">
          <h1 className="text-xl font-bold" style={{ color: '#e8e4dc' }}>博客</h1>
          <p className="text-sm mt-1 mb-4" style={{ color: '#6a7a7e' }}>
            从申请攻略到导师推荐——一站式了解澳洲 PhD 申请的方方面面
          </p>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.1)' }}>
            <Search className="size-4 flex-shrink-0" style={{ color: '#6a7a7e' }} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
              placeholder="搜索文章... 输入关键字后按 Enter"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#e8e4dc' }}
            />
            <button
              onClick={doSearch}
              className="px-3 py-1 rounded-lg text-xs font-medium flex-shrink-0"
              style={{ background: '#c9a96e', color: '#080c10' }}
            >
              搜索
            </button>
          </div>
        </div>

        {/* Category pills + sort */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-2 whitespace-nowrap">
                {CATEGORIES.map(cat => {
                  const active = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => { setActiveCategory(cat.key); setPage(1); }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
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
            <div className="flex gap-1 flex-shrink-0">
              {([['date', '🕐 最新'], ['hot', '🔥 最热']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setPage(1); }}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                  style={sortBy === key
                    ? { background: '#c9a96e', color: '#080c10' }
                    : { background: 'transparent', color: '#6a7a7e', border: '1px solid rgba(201,169,110,0.15)' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Total count */}
        {!loading && (
          <div className="px-5 pb-3">
            <span className="text-xs" style={{ color: '#6a7a7e' }}>共 {total} 篇文章</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="px-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl animate-pulse overflow-hidden" style={{ background: 'linear-gradient(180deg, #111c28, #0d1520)', border: '1px solid rgba(201,169,110,0.08)' }}>
                <div className="w-full h-[160px]" style={{ background: 'rgba(201,169,110,0.08)' }} />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 rounded w-3/4" style={{ background: 'rgba(201,169,110,0.08)' }} />
                  <div className="h-3 rounded w-full" style={{ background: 'rgba(201,169,110,0.05)' }} />
                  <div className="h-3 rounded w-1/2" style={{ background: 'rgba(201,169,110,0.05)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && posts.length === 0 && (
          <div className="px-5 pt-12 text-center">
            <p className="text-sm" style={{ color: '#6a7a7e' }}>
              {search ? `没有找到「${search}」相关的文章` : '暂无文章'}
            </p>
          </div>
        )}

        {/* Article grid */}
        {!loading && posts.length > 0 && (
          <div className="px-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/koala/blog/${post.id}`}
                className="blog-card block rounded-xl no-underline transition-all active:scale-[0.98] overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #111c28, #0d1520)', border: '1px solid rgba(201,169,110,0.08)' }}
              >
                {/* Cover image */}
                <div
                  className="w-full h-[160px]"
                  style={{
                    background: post.cover_image_url
                      ? `url(${post.cover_image_url}) center/cover`
                      : 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))',
                  }}
                />

                <div className="p-3.5">
                  {/* Category + source */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.06)', color: '#c9a96e' }}>
                      {CATEGORY_LABELS[post.category] || post.category}
                    </span>
                    <span className="text-[10px]" style={{ color: '#5a6a6e' }}>
                      {getSourceLabel(post.category)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-2" style={{ color: '#e8e4dc' }}>
                    {post.title_zh || post.title_en}
                  </h3>

                  {/* Excerpt */}
                  {(post.excerpt_zh || post.excerpt_en) && (
                    <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: '#6a7a7e' }}>
                      {post.excerpt_zh || post.excerpt_en}
                    </p>
                  )}

                  {/* Meta: date + reading time + views */}
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: '#5a6a6e' }}>
                    <span>📅 {formatDate(post.published_at)}</span>
                    <span>·</span>
                    <span>⏱ {post.reading_time_zh || 5} min</span>
                    {post.view_count ? (
                      <>
                        <span>·</span>
                        <span>👁 {post.view_count}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-5 mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={page <= 1
                ? { color: '#4a5a5e', border: '1px solid rgba(201,169,110,0.08)', cursor: 'not-allowed' }
                : { color: '#c9a96e', border: '1px solid rgba(201,169,110,0.2)' }
              }
            >
              ← 上一页
            </button>
            <span className="text-xs" style={{ color: '#6a7a7e' }}>
              第 {page}/{totalPages} 页
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={page >= totalPages
                ? { color: '#4a5a5e', border: '1px solid rgba(201,169,110,0.08)', cursor: 'not-allowed' }
                : { color: '#c9a96e', border: '1px solid rgba(201,169,110,0.2)' }
              }
            >
              下一页 →
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="px-5 mt-8">
          <div
            className="rounded-xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg, #1a2a20, #0d1a14)', border: '1px solid rgba(201,169,110,0.2)' }}
          >
            <div>
              <h3 className="text-base font-semibold mb-1" style={{ color: '#e8e4dc' }}>
                🐨 还在犹豫？先聊聊你的想法
              </h3>
              <p className="text-xs" style={{ color: '#6a7a7e' }}>AI 导师匹配，免费开始</p>
            </div>
            <Link
              href="/koala/chat"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm no-underline flex-shrink-0"
              style={{ background: '#c9a96e', color: '#080c10' }}
            >
              开始对话 <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `.blog-card:hover { border-color: rgba(201,169,110,0.2) !important; }` }} />
    </div>
  );
}
