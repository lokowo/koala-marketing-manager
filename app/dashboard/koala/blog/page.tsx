'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title_zh: string | null;
  title_en: string | null;
  category: string;
  author: string;
  status: string;
  view_count: number;
  created_at: string;
  published_at: string | null;
  tags: string[];
}

const CATEGORIES: Record<string, string> = {
  phd_guide: 'PhD指南',
  application: '申请攻略',
  scholarship: '奖学金',
  visa: '签证攻略',
  supervisor: '导师关系',
  research: '科研方法',
  student_life: '留学生活',
  news: '行业新闻',
  professor_spotlight: '教授推荐',
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  draft: { label: '草稿', class: 'bg-gray-100 text-gray-700' },
  published: { label: '已发布', class: 'bg-green-100 text-green-700' },
  scheduled: { label: '定时', class: 'bg-blue-100 text-blue-700' },
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('date');
  const [counts, setCounts] = useState({ draft: 0, published: 0, scheduled: 0, all: 0 });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('status', tab);
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    params.set('sort', sort);

    const res = await fetch(`/api/blog?${params}`);
    const data = await res.json();
    setPosts(data.posts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [tab, category, search, sort]);

  const fetchCounts = useCallback(async () => {
    const [draftRes, pubRes, schedRes, allRes] = await Promise.all([
      fetch('/api/blog?status=draft&limit=1').then(r => r.json()),
      fetch('/api/blog?status=published&limit=1').then(r => r.json()),
      fetch('/api/blog?status=scheduled&limit=1').then(r => r.json()),
      fetch('/api/blog?limit=1').then(r => r.json()),
    ]);
    setCounts({
      draft: draftRes.total || 0,
      published: pubRes.total || 0,
      scheduled: schedRes.total || 0,
      all: allRes.total || 0,
    });
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  async function handleDelete(id: string) {
    if (!confirm('确定删除这篇文章？')) return;
    await fetch('/api/blog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchPosts();
    fetchCounts();
  }

  async function handlePublish(id: string) {
    await fetch('/api/blog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'published', published_at: new Date().toISOString() }) });
    fetchPosts();
    fetchCounts();
  }

  const tabs = [
    { key: 'draft', icon: '📝', label: '草稿箱', count: counts.draft },
    { key: 'published', icon: '✅', label: '已发布', count: counts.published },
    { key: 'scheduled', icon: '⏰', label: '定时发布', count: counts.scheduled },
    { key: 'all', icon: '📋', label: '全部', count: counts.all },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">博客管理 Blog CMS</h2>
          <p className="text-sm text-gray-500 mt-1">AI生成文章自动保存到草稿箱，编辑确认后点击发布</p>
        </div>
        <div className="flex gap-2">
          <Link href="/koala/blog" target="_blank" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            🌐 查看博客
          </Link>
          <Link href="/dashboard/koala/ai-content/batch" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            ✨ 批量SEO
          </Link>
          <Link href="/dashboard/koala/ai-content" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            ✏️ AI生成
          </Link>
          <Link href="/dashboard/koala/blog/edit" className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            + 新建文章
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索文章标题..."
          className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">全部分类</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="date">按日期排序</option>
          <option value="views">按浏览量排序</option>
        </select>
      </div>

      {/* AI Quick Entry */}
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-green-800">AI批量生成SEO文章</h4>
          <p className="text-sm text-green-700 mt-0.5">选择推荐主题，一键生成中英文双语文章并自动发布，提升Google搜索排名</p>
        </div>
        <Link href="/dashboard/koala/ai-content/batch" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          ⚡ 开始生成
        </Link>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-4">📝</p>
          <p className="text-gray-500">还没有文章，点击 AI生成 快速创建SEO优化文章</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const statusInfo = STATUS_LABELS[post.status] || STATUS_LABELS.draft;
            return (
              <div key={post.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{post.title_zh || post.title_en || '无标题'}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.class}`}>{statusInfo.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded">{CATEGORIES[post.category] || post.category}</span>
                    <span>{post.author}</span>
                    <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
                    <span>👁 {post.view_count}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link href={`/dashboard/koala/blog/edit?id=${post.id}`} className="text-sm text-gray-600 hover:text-amber-600 px-2 py-1">
                    编辑
                  </Link>
                  {post.status === 'draft' && (
                    <button onClick={() => handlePublish(post.id)} className="text-sm text-green-600 hover:text-green-700 px-2 py-1">
                      发布
                    </button>
                  )}
                  <button onClick={() => handleDelete(post.id)} className="text-sm text-red-500 hover:text-red-700 px-2 py-1">
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 20 && (
        <p className="text-sm text-center text-gray-500">显示 {posts.length} / {total} 篇文章</p>
      )}
    </div>
  );
}
