'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title_zh: string | null;
  title_en: string | null;
  excerpt_zh: string | null;
  excerpt_en: string | null;
  category: string;
  author: string;
  status: string;
  view_count: number;
  created_at: string;
  published_at: string | null;
  tags: string[];
  cover_image_url: string | null;
  seo_title_zh?: string | null;
  seo_description_zh?: string | null;
  content_en?: string | null;
  is_pinned?: boolean;
}

interface Professor {
  id: string;
  name: string;
  name_en?: string;
  university: string;
  institution?: string;
  researchAreas?: string[];
  research_tags?: string[];
  research_areas?: string[];
  hIndex?: number;
  paperCount?: number;
}

const CATEGORIES: Record<string, { zh: string; en: string }> = {
  phd_guide: { zh: 'PhD指南', en: 'PhD Guide' },
  application: { zh: '申请攻略', en: 'Application' },
  scholarship: { zh: '奖学金', en: 'Scholarship' },
  visa: { zh: '签证攻略', en: 'Visa' },
  supervisor: { zh: '导师关系', en: 'Supervisor' },
  research: { zh: '科研方法', en: 'Research' },
  student_life: { zh: '留学生活', en: 'Student Life' },
  news: { zh: '行业新闻', en: 'News' },
  professor_spotlight: { zh: '教授推荐', en: 'Professor' },
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  draft: { label: '草稿', class: 'bg-slate-100 text-slate-700' },
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
  const [showProfModal, setShowProfModal] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('status', tab);
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    params.set('sort', sort);

    const res = await fetch(`/api/blog?${params}`);
    const data = await res.json();
    const allPosts: BlogPost[] = data.posts || [];
    const pinned = allPosts.filter(p => p.is_pinned);
    const unpinned = allPosts.filter(p => !p.is_pinned);
    setPosts([...pinned, ...unpinned]);
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

  async function handlePin(id: string, currentlyPinned: boolean) {
    await fetch('/api/blog', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_pinned: !currentlyPinned, pin_order: currentlyPinned ? null : 1 }),
    });
    fetchPosts();
  }

  const tabs = [
    { key: 'draft', icon: '📝', label: '草稿箱', count: counts.draft },
    { key: 'published', icon: '✅', label: '已发布', count: counts.published },
    { key: 'scheduled', icon: '⏰', label: '定时发布', count: counts.scheduled },
    { key: 'all', icon: '📋', label: '全部', count: counts.all },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">博客管理 Blog CMS</h2>
          <p className="text-sm text-slate-500 mt-1">AI生成文章自动保存到草稿箱，编辑确认后点击发布</p>
        </div>
        <div className="flex gap-2">
          <Link href="/koala/blog" target="_blank" className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
            🌐 查看博客
          </Link>
          <Link href="/dashboard/koala/ai-content/batch" className="px-4 py-2 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
            ⚡ 批量生成
          </Link>
          <button onClick={() => setShowProfModal(true)} className="px-4 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50">
            🎓 教授推荐
          </button>
          <Link href="/dashboard/koala/ai-content" className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
            ✏️ AI生成
          </Link>
          <Link href="/dashboard/koala/blog/edit" className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            + 新建文章
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
          className="flex-1 max-w-xs border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">全部分类</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v.zh}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="date">按日期排序</option>
          <option value="views">按浏览量排序</option>
        </select>
      </div>

      {/* AI Quick Entry */}
      <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-green-800">AI批量生成SEO文章</h4>
          <p className="text-sm text-green-700 mt-0.5">选择推荐主题，一键生成中英文双语文章并自动发布</p>
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
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-slate-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-4">📝</p>
          <p className="text-slate-500">还没有文章，点击 AI生成 快速创建SEO优化文章</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const statusInfo = STATUS_LABELS[post.status] || STATUS_LABELS.draft;
            const cat = CATEGORIES[post.category] || { zh: post.category, en: '' };
            const hasSeo = !!(post.seo_title_zh || post.seo_description_zh);
            const hasBilingual = !!(post.title_zh && post.title_en);
            const displayTags = post.tags?.slice(0, 3) || [];
            const extraTagCount = (post.tags?.length || 0) - 3;

            return (
              <div
                key={post.id}
                className={`bg-white rounded-lg shadow p-4 flex gap-3 ${post.is_pinned ? 'ring-2 ring-amber-200' : ''}`}
              >
                {/* Thumbnail */}
                <div
                  className="w-20 h-20 rounded-lg flex-shrink-0 bg-slate-100"
                  style={{
                    background: post.cover_image_url
                      ? `url(${post.cover_image_url}) center/cover`
                      : '#f3f4f6',
                  }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top badges */}
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {post.is_pinned && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">📌 置顶</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusInfo.class}`}>{statusInfo.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {cat.zh} / {cat.en}
                    </span>
                    {hasSeo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">SEO</span>
                    )}
                    {hasBilingual && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">双语</span>
                    )}
                  </div>

                  {/* Chinese title */}
                  <h4 className="font-semibold text-slate-900 text-sm truncate">
                    {post.title_zh || post.title_en || '无标题'}
                  </h4>

                  {/* English title */}
                  {post.title_en && post.title_zh && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{post.title_en}</p>
                  )}

                  {/* Excerpt */}
                  {(post.excerpt_zh || post.excerpt_en) && (
                    <p className="text-xs text-slate-500 truncate mt-1">{post.excerpt_zh || post.excerpt_en}</p>
                  )}

                  {/* Tags + meta */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {displayTags.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{tag}</span>
                    ))}
                    {extraTagCount > 0 && (
                      <span className="text-[10px] text-slate-400">+{extraTagCount}</span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {new Date(post.created_at).toLocaleDateString('zh-CN')} · 👁 {post.view_count}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handlePin(post.id, !!post.is_pinned)}
                    title={post.is_pinned ? '取消置顶' : '置顶'}
                    className={`text-sm px-1.5 py-1 rounded hover:bg-slate-100 ${post.is_pinned ? 'text-amber-600' : 'text-slate-400'}`}
                  >
                    📌
                  </button>
                  {post.status === 'draft' && (
                    <button onClick={() => handlePublish(post.id)} title="发布" className="text-sm px-1.5 py-1 rounded hover:bg-slate-100 text-green-600">
                      ✈️
                    </button>
                  )}
                  <Link href={`/dashboard/koala/blog/edit?id=${post.id}`} title="编辑" className="text-sm px-1.5 py-1 rounded hover:bg-slate-100 text-slate-600">
                    ✏️
                  </Link>
                  <Link href={`/dashboard/koala/blog/edit?id=${post.id}&mode=preview`} title="预览发布效果" className="text-sm px-1.5 py-1 rounded hover:bg-slate-100 text-green-500">
                    👁
                  </Link>
                  <CoverButton post={post} onDone={fetchPosts} showToast={showToast} />
                  <ImageManagerButton post={post} onDone={fetchPosts} showToast={showToast} />
                  <button onClick={() => handleDelete(post.id)} title="删除" className="text-sm px-1.5 py-1 rounded hover:bg-slate-100 text-red-400">
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 20 && (
        <p className="text-sm text-center text-slate-500">显示 {posts.length} / {total} 篇文章</p>
      )}

      {/* Professor Spotlight Modal */}
      {showProfModal && (
        <ProfessorSpotlightModal
          onClose={() => setShowProfModal(false)}
          onGenerated={() => { setShowProfModal(false); fetchPosts(); fetchCounts(); }}
        />
      )}
    </div>
  );
}

interface SearchCandidate {
  name: string;
  university: string;
  position?: string;
  faculty?: string;
  researchAreas: string[];
  hIndex?: number;
  paperCount?: number;
  citationCount?: number;
  email?: string;
  profileUrl?: string;
  googleScholarUrl?: string;
  source: 'database' | 'openalex' | 'claude_web_search';
  confidence: 'high' | 'medium' | 'low';
  universityMismatch?: boolean;
  existsInDb: boolean;
  dbId?: string;
}

type ModalStep = 'search' | 'web-searching' | 'candidates' | 'generating' | 'done';

function ProfessorSpotlightModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [universityHint, setUniversityHint] = useState('');
  const [suggestions, setSuggestions] = useState<Professor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProf, setSelectedProf] = useState<Professor | null>(null);
  const [searchCandidates, setSearchCandidates] = useState<SearchCandidate[]>([]);
  const [step, setStep] = useState<ModalStep>('search');
  const [genStep, setGenStep] = useState('');
  const [error, setError] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [loadingRandom, setLoadingRandom] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const poolRef = useRef<Professor[]>([]);

  async function fetchRandomProf() {
    setLoadingRandom(true);
    try {
      if (poolRef.current.length === 0) {
        const res = await fetch('/api/professors?limit=20&sortBy=opportunity_score');
        const data = await res.json();
        poolRef.current = data.data || data.professors || [];
      }
      if (poolRef.current.length > 0) {
        const idx = Math.floor(Math.random() * poolRef.current.length);
        const prof = poolRef.current[idx];
        setSelectedProf(prof);
        setSearchQuery(prof.name || prof.name_en || '');
        setShowDropdown(false);
      }
    } catch { /* ignore */ }
    setLoadingRandom(false);
  }

  useEffect(() => { fetchRandomProf(); }, []);

  function handleInputChange(value: string) {
    setSearchQuery(value);
    setSelectedProf(null);
    setSearchCandidates([]);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/professors?search=${encodeURIComponent(value)}&limit=5`);
        const data = await res.json();
        const profs = data.data || data.professors || [];
        setSuggestions(profs);
        setShowDropdown(profs.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);
  }

  function handleSelectProf(prof: Professor) {
    setSelectedProf(prof);
    setSearchQuery(prof.name || prof.name_en || '');
    setShowDropdown(false);
    setSearchCandidates([]);
  }

  async function handleWebSearch() {
    setStep('web-searching');
    setError('');
    try {
      const uniParam = universityHint.trim() ? `&university=${encodeURIComponent(universityHint.trim())}` : '';
      const res = await fetch(`/api/professors/auto-search?name=${encodeURIComponent(searchQuery)}${uniParam}`);
      const data = await res.json();
      const allCandidates: SearchCandidate[] = data.candidates || [];
      if (allCandidates.length > 0) {
        setSearchCandidates(allCandidates);
        setStep('candidates');
      } else {
        setError(`未找到「${searchQuery}」。可以尝试：1) 输入英文全名 2) 添加大学名 3) 检查拼写`);
        setStep('search');
      }
    } catch {
      setError('搜索失败，请重试');
      setStep('search');
    }
  }

  async function handleSelectCandidate(candidate: SearchCandidate) {
    setStep('generating');
    setGenStep('正在录入教授到数据库...');
    setError('');
    try {
      let profId: string;

      if (candidate.existsInDb && candidate.dbId) {
        profId = candidate.dbId;
      } else {
        const createRes = await fetch('/api/professors/auto-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate }),
        });
        if (!createRes.ok) {
          const errData = await createRes.json();
          throw new Error(errData.error || '录入教授失败');
        }
        const createData = await createRes.json();
        profId = createData.professor?.id;
        if (!profId) throw new Error('录入教授失败：未返回 ID');
      }

      await generateArticle(profId);
    } catch (e) {
      setError(`操作失败：${(e as Error).message}`);
      setStep('search');
    }
  }

  async function handleGenerateExisting() {
    if (!selectedProf) return;
    setStep('generating');
    setError('');
    await generateArticle(selectedProf.id);
  }

  async function generateArticle(professorId: string) {
    setGenStep('读取教授数据、论文、经费...');

    try {
      const res = await fetch('/api/blog/generate-professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professorId }),
      });
      setGenStep('撰写文章 + 翻译 + SEO...');
      const data = await res.json();
      if (data.success) {
        setGeneratedTitle(data.title || '文章已生成');
        setStep('done');
      } else {
        setError(data.details ? `${data.error}: ${data.details}` : (data.error || '生成失败'));
        setStep('search');
      }
    } catch {
      setError('生成失败，请重试');
      setStep('search');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 min-h-[400px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">🎓 生成教授推荐文章</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        {(step === 'search' || step === 'web-searching') && (
          <>
            <div className="relative mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleInputChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="输入教授英文全名（如 John Smith）"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleWebSearch}
                  disabled={!searchQuery.trim() || step === 'web-searching'}
                  className="px-3 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {step === 'web-searching' ? '⏳ 搜索中...' : '🌐 网络搜索'}
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={universityHint}
                  onChange={e => setUniversityHint(e.target.value)}
                  placeholder="大学名称（可选，帮助精确匹配）"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600"
                />
                <button
                  onClick={fetchRandomProf}
                  disabled={loadingRandom}
                  className="px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {loadingRandom ? '加载中...' : '🎲 随机推荐'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">💡 输入自动搜索数据库 → 找不到可点「🌐 网络搜索」从 OpenAlex 查找</p>

              {showDropdown && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[50vh] overflow-y-auto">
                  {suggestions.map(prof => (
                    <button
                      key={prof.id}
                      onClick={() => handleSelectProf(prof)}
                      className="w-full text-left px-4 py-4 hover:bg-purple-50 border-b border-slate-100 last:border-0"
                    >
                      <p className="text-base font-semibold text-slate-900">{prof.name || prof.name_en}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{prof.university || prof.institution}</p>
                      {(prof.researchAreas || prof.research_tags || prof.research_areas || []).length > 0 && (
                        <p className="text-sm text-purple-600 mt-0.5">{(prof.researchAreas || prof.research_tags || prof.research_areas || []).slice(0, 3).join(', ')}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProf && (
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{selectedProf.name || selectedProf.name_en}</p>
                    <p className="text-sm text-slate-600">{selectedProf.university || selectedProf.institution}</p>
                    <div className="flex gap-3 mt-1.5 text-xs text-slate-600">
                      {selectedProf.hIndex && <span>H-index: {selectedProf.hIndex}</span>}
                      {selectedProf.paperCount && <span>论文: {selectedProf.paperCount}</span>}
                    </div>
                    {(selectedProf.researchAreas || selectedProf.research_tags || selectedProf.research_areas || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(selectedProf.researchAreas || selectedProf.research_tags || selectedProf.research_areas || []).slice(0, 5).map((tag, i) => (
                          <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={fetchRandomProf}
                    disabled={loadingRandom}
                    className="text-xs text-amber-600 hover:text-amber-700 whitespace-nowrap ml-2"
                  >
                    换一个 🔄
                  </button>
                </div>
                <button
                  onClick={handleGenerateExisting}
                  className="mt-3 w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  ✨ 生成推荐文章
                </button>
              </div>
            )}

            {!selectedProf && searchQuery.trim().length >= 2 && !showDropdown && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 mb-4 text-xs text-amber-800 space-y-1">
                <p className="font-medium">⚠️ 不是你要找的教授？点击「🌐 网络搜索」用 AI 深度搜索</p>
                <p>👉 从 OpenAlex 学术数据库 + 大学官网 + 网络搜索查找</p>
                <p>👉 可在上方填入大学名称以提高匹配精度</p>
                <p>👉 建议使用教授的英文全名搜索（如 &quot;Kirill Koshelev&quot;）</p>
              </div>
            )}
          </>
        )}

        {step === 'candidates' && searchCandidates.length > 0 && (
          <div className="mb-4">
            <div className="border border-purple-200 bg-purple-50 rounded-lg px-3 py-2 mb-3 text-xs text-purple-700">
              ⚠️ 不是你要找的教授？返回重新搜索，输入更精确的教授全名和大学名
            </div>
            <p className="text-sm text-slate-700 font-medium mb-3">
              找到 {searchCandidates.length} 位候选人 — 请确认目标教授：
            </p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {searchCandidates.map((c, idx) => {
                const sourceBadge = c.source === 'database'
                  ? { label: '✅ 已收录', cls: 'bg-green-100 text-green-700' }
                  : c.source === 'openalex'
                    ? { label: '📊 学术数据库', cls: 'bg-blue-100 text-blue-700' }
                    : { label: '🔍 网络验证', cls: 'bg-purple-100 text-purple-700' };
                return (
                  <button
                    key={idx}
                    onClick={() => !c.universityMismatch && handleSelectCandidate(c)}
                    disabled={!!c.universityMismatch}
                    className={`w-full text-left border rounded-lg p-3 transition ${c.universityMismatch ? 'border-red-200 bg-red-50/50 opacity-60 cursor-not-allowed' : 'border-slate-200 hover:border-purple-400 hover:bg-purple-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sourceBadge.cls}`}>{sourceBadge.label}</span>
                      {c.confidence === 'high' && <span className="text-[10px] text-green-600">高匹配</span>}
                      {c.confidence === 'medium' && <span className="text-[10px] text-amber-600">中匹配</span>}
                      {c.universityMismatch && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">大学不匹配 ⚠️</span>}
                    </div>
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className={`text-sm ${c.universityMismatch ? 'text-red-600' : 'text-slate-600'}`}>
                      {c.position ? `${c.position} — ` : ''}{c.university}
                      {c.universityMismatch && <span className="ml-1.5 font-semibold">[不推荐]</span>}
                    </p>
                    {c.faculty && <p className="text-xs text-slate-500">{c.faculty}</p>}
                    {c.researchAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.researchAreas.slice(0, 5).map((tag, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                      {c.hIndex != null && <span>H-index: {c.hIndex}</span>}
                      {c.paperCount != null && <span>论文: {c.paperCount}</span>}
                      {c.citationCount != null && <span>引用: {c.citationCount}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setStep('search'); setSearchCandidates([]); setError(''); }}
              className="mt-3 text-sm text-slate-500 hover:text-slate-700"
            >
              ← 返回重新搜索
            </button>
          </div>
        )}

        {step === 'generating' && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-700 font-medium">{genStep}</p>
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <p className={genStep.includes('读取') ? 'text-purple-600 font-medium' : ''}>1. 读取教授数据 + 论文 + 经费</p>
              <p className={genStep.includes('撰写') ? 'text-purple-600 font-medium' : ''}>2. 撰写中文文章 + 翻译 + SEO</p>
              <p className={genStep.includes('完成') ? 'text-purple-600 font-medium' : ''}>3. 保存到草稿箱</p>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-medium text-slate-900">{generatedTitle}</p>
            <p className="text-xs text-slate-500 mt-1">文章已保存到草稿箱</p>
            <button
              onClick={onGenerated}
              className="mt-4 px-6 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              完成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CoverButton({ post, onDone, showToast }: { post: BlogPost; onDone: () => void; showToast: (msg: string) => void }) {
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/blog/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (data.success) { onDone(); showToast('封面图已生成'); }
      else showToast('封面图生成中，请稍候刷新查看');
    } catch { showToast('封面图生成中，请稍候刷新查看'); }
    setGenerating(false);
  }

  const hasImage = !!post.cover_image_url;

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      title={hasImage ? '重新生成封面' : '生成封面'}
      className={`text-sm px-1.5 py-1 rounded hover:bg-slate-100 disabled:opacity-50 ${hasImage ? 'text-slate-400' : 'text-purple-500'}`}
    >
      {generating ? '⏳' : hasImage ? '🔄' : '🎨'}
    </button>
  );
}

// ─── Image Manager ─────────────────────────────────────────────────────────

interface ImagePrompt {
  index: number;
  promptEn: string;
  suggestedHeading: string;
}

interface ManagedImage {
  index: number;
  url: string;
  prompt: string;
  suggestedHeading: string;
  position: string; // 'auto' | 'after:heading'
}

type ImageManagerStatus = 'idle' | 'generating_prompts' | 'generating_images' | 'done' | 'editing';

function ImageManagerButton({ post, onDone, showToast }: { post: BlogPost; onDone: () => void; showToast: (msg: string) => void }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="管理插图"
        className="text-sm px-1.5 py-1 rounded hover:bg-slate-100 text-blue-500"
      >
        📸
      </button>
      {showModal && (
        <ImageManagerModal
          post={post}
          onClose={() => setShowModal(false)}
          onDone={() => { onDone(); showToast('插图已更新'); }}
          showToast={showToast}
        />
      )}
    </>
  );
}

function extractHeadings(content: string): string[] {
  const matches = content.match(/^##\s+(.+)$/gm);
  return matches ? matches.map(m => m.replace(/^##\s+/, '')) : [];
}

function extractExistingImages(content: string): { alt: string; url: string }[] {
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: { alt: string; url: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    images.push({ alt: match[1], url: match[2] });
  }
  return images;
}

function ImageManagerModal({
  post,
  onClose,
  onDone,
  showToast,
}: {
  post: BlogPost;
  onClose: () => void;
  onDone: () => void;
  showToast: (msg: string) => void;
}) {
  const [status, setStatus] = useState<ImageManagerStatus>('idle');
  const [imageCount, setImageCount] = useState(3);
  const [prompts, setPrompts] = useState<ImagePrompt[]>([]);
  const [images, setImages] = useState<ManagedImage[]>([]);
  const [currentGenerating, setCurrentGenerating] = useState(0);
  const [totalGenerating, setTotalGenerating] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [extraPromptInput, setExtraPromptInput] = useState('');
  const [generatingExtra, setGeneratingExtra] = useState(false);

  // Load post content on mount
  useEffect(() => {
    fetch(`/api/blog/${post.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.post?.content_zh) setPostContent(data.post.content_zh);
      })
      .catch(() => {});
  }, [post.id]);

  const headings = extractHeadings(postContent);
  const existingImages = extractExistingImages(postContent);

  async function handleGenerate() {
    setStatus('generating_prompts');
    setPrompts([]);
    setImages([]);

    try {
      const res = await fetch('/api/blog/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, imageCount }),
      });
      const data = await res.json();

      if (!data.prompts?.length) {
        showToast('未能生成图片建议');
        setStatus('idle');
        return;
      }

      setPrompts(data.prompts);
      setStatus('generating_images');
      setTotalGenerating(data.prompts.length);

      const generated: ManagedImage[] = [];
      for (let i = 0; i < data.prompts.length; i++) {
        setCurrentGenerating(i + 1);
        try {
          const imgRes = await fetch('/api/blog/generate-single-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId: post.id,
              promptEn: data.prompts[i].promptEn,
              index: i,
            }),
          });
          const imgData = await imgRes.json();
          if (imgData.imageUrl) {
            const newImg: ManagedImage = {
              index: generated.length,
              url: imgData.imageUrl,
              prompt: data.prompts[i].promptEn,
              suggestedHeading: data.prompts[i].suggestedHeading,
              position: 'auto',
            };
            generated.push(newImg);
            setImages([...generated]);
          }
        } catch {
          // Skip failed image
        }
      }

      setStatus(generated.length > 0 ? 'done' : 'idle');
      if (generated.length === 0) showToast('所有图片生成失败');
    } catch {
      showToast('生成失败，请重试');
      setStatus('idle');
    }
  }

  async function handleGenerateExtra() {
    setGeneratingExtra(true);
    try {
      const res = await fetch('/api/blog/generate-single-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          promptEn: extraPromptInput.trim() || 'A professional academic research environment, modern university setting, natural lighting',
          index: images.length,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setImages(prev => [...prev, {
          index: prev.length,
          url: data.imageUrl,
          prompt: extraPromptInput.trim() || 'additional illustration',
          suggestedHeading: '',
          position: 'auto',
        }]);
        setExtraPromptInput('');
        showToast('新图片已生成');
      } else {
        showToast('生成失败');
      }
    } catch {
      showToast('生成失败');
    }
    setGeneratingExtra(false);
  }

  function moveImage(idx: number, direction: 'up' | 'down') {
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= images.length) return;
    const newImages = [...images];
    [newImages[idx], newImages[swap]] = [newImages[swap], newImages[idx]];
    newImages.forEach((img, i) => { img.index = i; });
    setImages(newImages);
  }

  function removeImage(idx: number) {
    setImages(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      filtered.forEach((img, i) => { img.index = i; });
      return filtered;
    });
  }

  function updatePosition(idx: number, position: string) {
    setImages(prev => prev.map((img, i) => i === idx ? { ...img, position } : img));
  }

  async function handleSaveAndInsert() {
    if (images.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/blog/insert-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          images: images.map(img => ({
            url: img.url,
            alt: img.suggestedHeading || img.prompt.slice(0, 30),
            position: img.position === 'auto' ? 'auto' : img.position,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPostContent(data.updatedContent);
        onDone();
        onClose();
      } else {
        showToast(data.error || '插入失败');
      }
    } catch {
      showToast('插入失败');
    }
    setSaving(false);
  }

  const progressPercent = totalGenerating > 0
    ? Math.round((images.length / totalGenerating) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">📸 文章插图</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
              {post.title_zh || post.title_en || '未命名文章'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        <div className="p-6">
          {/* Existing images info */}
          {existingImages.length > 0 && status === 'idle' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                文章中已有 {existingImages.length} 张插图。生成的新图片将追加插入。
              </p>
            </div>
          )}

          {/* State 1: Initial */}
          {status === 'idle' && (
            <div className="text-center py-8">
              <p className="text-4xl mb-4">📸</p>
              <p className="text-sm text-slate-600 mb-6">选择插图数量，AI 将分析文章内容生成适配插图</p>
              <div className="flex items-center justify-center gap-3 mb-6">
                {[1, 3, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setImageCount(n)}
                    className={`px-5 py-2.5 text-sm rounded-lg border-2 transition font-medium ${
                      imageCount === n
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    {n} 张
                  </button>
                ))}
              </div>
              <button
                onClick={handleGenerate}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition"
              >
                🎨 开始生成
              </button>
            </div>
          )}

          {/* State 2: Generating */}
          {(status === 'generating_prompts' || status === 'generating_images') && (
            <div className="py-6">
              <div className="text-center mb-6">
                <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-800">
                  {status === 'generating_prompts'
                    ? '正在分析文章内容，生成图片描述...'
                    : `正在生成第 ${currentGenerating}/${totalGenerating} 张插图...`
                  }
                </p>
              </div>

              {status === 'generating_images' && (
                <>
                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>进度</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Per-image status */}
                  <div className="space-y-2">
                    {prompts.map((p, i) => {
                      const generated = images.find(img => img.prompt === p.promptEn);
                      const isActive = i + 1 === currentGenerating && !generated;
                      const isPending = i + 1 > currentGenerating && !generated;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            generated ? 'border-green-200 bg-green-50' :
                            isActive ? 'border-blue-200 bg-blue-50' :
                            'border-slate-100 bg-slate-50'
                          }`}
                        >
                          <span className="text-lg flex-shrink-0">
                            {generated ? '✅' : isActive ? '⏳' : isPending ? '⬜' : '⬜'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${generated ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                              {generated ? `第 ${i + 1} 张已完成` : isActive ? `正在生成第 ${i + 1} 张...` : `第 ${i + 1} 张等待中`}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              Prompt: {p.promptEn.slice(0, 80)}...
                            </p>
                          </div>
                          {generated && (
                            <img src={generated.url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* State 3: Done (Preview mode) */}
          {status === 'done' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-800">
                  📸 文章插图 ({images.length} 张)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus('editing')}
                    className="px-3 py-1.5 text-xs border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    ✏️ 编辑图片
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="px-3 py-1.5 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
                  >
                    👁 预览文章
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {images.map(img => (
                  <div key={img.index} className="border border-slate-200 rounded-xl overflow-hidden">
                    <img src={img.url} alt="" className="w-full h-28 object-cover" />
                    <div className="p-2">
                      <p className="text-[10px] text-slate-500 truncate">{img.suggestedHeading || img.prompt.slice(0, 30)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStatus('editing')}
                  className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  ✏️ 编辑排列
                </button>
                <button
                  onClick={handleSaveAndInsert}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? '⏳ 保存中...' : '💾 保存并插入文章'}
                </button>
              </div>
            </div>
          )}

          {/* State 4: Editing */}
          {status === 'editing' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-800">📸 图片编辑器</p>
                <button
                  onClick={() => setStatus('done')}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  ← 返回预览
                </button>
              </div>

              {/* Sortable image list */}
              <div className="space-y-3 mb-6">
                {images.map((img, idx) => (
                  <div key={img.url} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl bg-white">
                    <img src={img.url} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 mb-1">图片 {idx + 1}</p>
                      <p className="text-[10px] text-slate-400 truncate mb-2">{img.prompt.slice(0, 60)}...</p>

                      {/* Position select */}
                      <select
                        value={img.position}
                        onChange={e => updatePosition(idx, e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                      >
                        <option value="auto">自动（AI 选择最佳位置）</option>
                        {headings.map(h => (
                          <option key={h} value={`after:${h}`}>在标题「{h}」后</option>
                        ))}
                      </select>
                    </div>

                    {/* Reorder + Delete */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => removeImage(idx)}
                        className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate more */}
              <div className="border border-dashed border-slate-300 rounded-xl p-4 mb-6">
                <p className="text-xs font-medium text-slate-600 mb-2">➕ 生成更多图片</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={extraPromptInput}
                    onChange={e => setExtraPromptInput(e.target.value)}
                    placeholder="描述想要的图片（可选，留空则自动生成）"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                  <button
                    onClick={handleGenerateExtra}
                    disabled={generatingExtra}
                    className="px-4 py-2 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {generatingExtra ? '⏳ 生成中...' : '🎨 生成'}
                  </button>
                </div>
              </div>

              {/* Save */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex-1 px-4 py-2.5 text-sm border border-green-300 text-green-700 rounded-xl hover:bg-green-50"
                >
                  👁 预览文章
                </button>
                <button
                  onClick={handleSaveAndInsert}
                  disabled={saving || images.length === 0}
                  className="flex-1 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? '⏳ 保存中...' : '💾 保存并插入文章'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Article Preview Modal */}
        {showPreview && (
          <ArticlePreviewModal
            post={post}
            content={postContent}
            images={images}
            onClose={() => setShowPreview(false)}
            onEdit={() => { setShowPreview(false); setStatus('editing'); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Article Preview Modal ─────────────────────────────────────────────────

function ArticlePreviewModal({
  post,
  content,
  images,
  onClose,
  onEdit,
}: {
  post: BlogPost;
  content: string;
  images: ManagedImage[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const previewContent = React.useMemo(() => {
    if (!content) return '';

    let result = content;
    const headings = (result.match(/^##\s+(.+)$/gm) || []).map(h => h.replace(/^##\s+/, ''));

    // Insert images at their positions (from bottom up)
    const toInsert = images.map(img => {
      let heading = '';
      if (img.position === 'auto') {
        const idx = Math.min(img.index, headings.length - 1);
        heading = headings[idx] || '';
      } else if (img.position.startsWith('after:')) {
        heading = img.position.slice(6);
      }
      const pattern = new RegExp(
        `(##\\s*${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*)`,
        'i'
      );
      const match = result.match(pattern);
      return { ...img, matchIndex: match?.index ?? -1, matchLength: match?.[0].length ?? 0 };
    });

    toInsert
      .filter(img => img.matchIndex >= 0)
      .sort((a, b) => b.matchIndex - a.matchIndex)
      .forEach(img => {
        const insertPos = img.matchIndex + img.matchLength;
        const md = `\n\n![${img.suggestedHeading || 'illustration'}](${img.url})\n`;
        result = result.slice(0, insertPos) + md + result.slice(insertPos);
      });

    // Convert markdown to simple HTML
    return result
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="width:100%;border-radius:8px;margin:16px 0" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563eb">$1</a>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin-left:20px;margin-bottom:16px">$&</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[hupolia])(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  }, [content, images]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 rounded-t-2xl flex items-center justify-between">
          <span className="text-sm font-medium text-green-700">👁 文章预览</span>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              ✏️ 进入编辑模式
            </button>
            <button onClick={onClose} className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">
              关闭
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Cover */}
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt=""
              className="w-full h-64 object-cover rounded-xl mb-6"
            />
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {post.title_zh || post.title_en || '无标题'}
          </h1>

          {post.excerpt_zh && (
            <p className="text-sm text-slate-500 mb-6">{post.excerpt_zh}</p>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none
              [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:text-sm [&_p]:text-slate-700 [&_p]:leading-relaxed [&_p]:mb-3
              [&_li]:text-sm [&_li]:text-slate-700
              [&_strong]:text-slate-900
              [&_a]:text-blue-600
              [&_img]:rounded-lg [&_img]:my-4"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />

          {/* New images badge */}
          {images.length > 0 && (
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                📸 预览包含 {images.length} 张新插图（尚未保存到文章）
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
