'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [showProfModal, setShowProfModal] = useState(false);

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
          <button onClick={() => setShowProfModal(true)} className="px-4 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50">
            🎓 教授推荐
          </button>
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

interface WebSearchProfessor {
  name: string;
  university: string;
  faculty: string | null;
  positionTitle: string | null;
  email: string | null;
  researchAreas: string[];
  hIndex: number | null;
  paperCount: number | null;
  citationCount: number | null;
  profileUrl: string | null;
  googleScholarUrl: string | null;
  opportunityScore: number;
}

type ModalStep = 'search' | 'web-searching' | 'web-result' | 'generating' | 'done';

function ProfessorSpotlightModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Professor[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProf, setSelectedProf] = useState<Professor | null>(null);
  const [webResult, setWebResult] = useState<WebSearchProfessor | null>(null);
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
    setWebResult(null);
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
    setWebResult(null);
  }

  async function handleWebSearch() {
    setStep('web-searching');
    setError('');
    try {
      const res = await fetch('/api/professors/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchQuery }),
      });
      const data = await res.json();
      if (data.professor) {
        setWebResult(data.professor);
        setStep('web-result');
      } else {
        setError(data.error || '未找到教授信息');
        setStep('search');
      }
    } catch {
      setError('网络搜索失败，请重试');
      setStep('search');
    }
  }

  async function handleAddAndGenerate() {
    if (!webResult) return;
    setStep('generating');
    setGenStep('正在添加教授到数据库...');
    setError('');
    try {
      const createRes = await fetch('/api/professors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webResult.name,
          university: webResult.university,
          faculty: webResult.faculty || '',
          positionTitle: webResult.positionTitle || 'Researcher',
          email: webResult.email || '',
          researchAreas: webResult.researchAreas || [],
          profileUrl: webResult.profileUrl || '',
          googleScholarUrl: webResult.googleScholarUrl || '',
          hIndex: webResult.hIndex,
          paperCount: webResult.paperCount,
          citationCount: webResult.citationCount,
          opportunityScore: webResult.opportunityScore || 50,
          verificationStatus: 'unverified',
          grantStatus: 'unknown',
        }),
      });
      const createData = await createRes.json();
      const profId = createData.data?.id;
      if (!profId) throw new Error('Failed to create professor');

      await generateArticle(profId);
    } catch (e) {
      setError('添加教授失败：' + (e as Error).message);
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
        setError(data.error || '生成失败');
        setStep('search');
      }
    } catch {
      setError('生成失败，请重试');
      setStep('search');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">🎓 生成教授推荐文章</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        {/* Search Step */}
        {(step === 'search' || step === 'web-searching') && (
          <>
            <div className="relative mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleInputChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  placeholder="输入教授姓名、大学或研究方向..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleWebSearch}
                  disabled={!searchQuery.trim() || step === 'web-searching'}
                  className="px-3 py-2 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {step === 'web-searching' ? '搜索中...' : '🔍 网络搜索'}
                </button>
              </div>
              <button
                onClick={fetchRandomProf}
                disabled={loadingRandom}
                className="mt-2 px-3 py-1.5 text-xs border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
              >
                {loadingRandom ? '加载中...' : '🎲 随机推荐'}
              </button>

              {/* Typeahead Dropdown */}
              {showDropdown && (
                <div className="absolute z-10 left-0 right-12 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map(prof => (
                    <button
                      key={prof.id}
                      onClick={() => handleSelectProf(prof)}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{prof.name || prof.name_en}</p>
                      <p className="text-xs text-gray-500">{prof.university || prof.institution}</p>
                      {(prof.researchAreas || prof.research_tags || prof.research_areas || []).length > 0 && (
                        <p className="text-xs text-purple-600">{(prof.researchAreas || prof.research_tags || prof.research_areas || []).slice(0, 3).join(', ')}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Professor Card */}
            {selectedProf && (
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedProf.name || selectedProf.name_en}</p>
                    <p className="text-sm text-gray-600">{selectedProf.university || selectedProf.institution}</p>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-600">
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

            {!selectedProf && searchQuery.trim().length >= 2 && (
              <p className="text-xs text-gray-500 mb-2">
                数据库中没有？点击右侧"🔍 网络搜索"从网上查找教授信息
              </p>
            )}
          </>
        )}

        {/* Web Search Result */}
        {step === 'web-result' && webResult && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 mb-4">
            <p className="text-xs text-green-700 font-medium mb-2">🌐 网络搜索结果</p>
            <p className="font-medium text-gray-900">{webResult.name}</p>
            <p className="text-sm text-gray-600">{webResult.positionTitle} — {webResult.university}</p>
            {webResult.faculty && <p className="text-sm text-gray-500">{webResult.faculty}</p>}
            <div className="flex gap-3 mt-2 text-xs text-gray-600">
              {webResult.hIndex && <span>H-index: {webResult.hIndex}</span>}
              {webResult.paperCount && <span>论文: {webResult.paperCount}</span>}
              {webResult.citationCount && <span>引用: {webResult.citationCount}</span>}
            </div>
            {webResult.researchAreas?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {webResult.researchAreas.slice(0, 5).map((tag, i) => (
                  <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAddAndGenerate}
                className="flex-1 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                ✨ 确认并生成文章
              </button>
              <button
                onClick={() => { setStep('search'); setWebResult(null); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                返回
              </button>
            </div>
          </div>
        )}

        {/* Generating Step */}
        {step === 'generating' && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-700 font-medium">{genStep}</p>
            <div className="mt-4 space-y-2 text-xs text-gray-500">
              <p className={genStep.includes('读取') ? 'text-purple-600 font-medium' : ''}>1. 读取教授数据 + 论文 + 经费</p>
              <p className={genStep.includes('撰写') ? 'text-purple-600 font-medium' : ''}>2. 撰写中文文章 + 翻译 + SEO</p>
              <p className={genStep.includes('完成') ? 'text-purple-600 font-medium' : ''}>3. 保存到草稿箱</p>
            </div>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && (
          <div className="text-center py-8">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-medium text-gray-900">{generatedTitle}</p>
            <p className="text-xs text-gray-500 mt-1">文章已保存到草稿箱</p>
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
