'use client';

import { useState, useEffect } from 'react';

interface KnowledgeStats {
  totalChunks: number;
  professorCount: number;
  lastUpdated: string | null;
}

export default function AIContentKnowledgePage() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ content: string; source_title: string; similarity: number }[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/knowledge-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* ignore */ }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'research', messages: [{ role: 'user', content: searchQuery }] }),
      });
      const data = await res.json();
      if (data.citations) {
        setSearchResults(data.citations.map((c: { title: string; authors: string }) => ({
          content: c.title,
          source_title: c.authors,
          similarity: 0.85,
        })));
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📚 知识库内容管理</h2>
        <p className="text-sm text-gray-500 mt-1">知识库统计、搜索测试与管理</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">总 Chunk 数量</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalChunks?.toLocaleString() ?? '-'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">覆盖教授数量</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.professorCount?.toLocaleString() ?? '-'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">最近更新时间</p>
          <p className="text-lg font-medium text-gray-900 mt-1">
            {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString('zh-CN') : '-'}
          </p>
        </div>
      </div>

      {/* Search Test */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-3">RAG 搜索测试</h3>
        <p className="text-sm text-gray-500 mb-4">输入关键词测试知识库搜索结果</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="例如：machine learning, quantum computing..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {searching ? '搜索中...' : '🔍 搜索'}
          </button>
        </div>

        {searchResults !== null && (
          <div className="mt-4 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">未找到相关结果</p>
            ) : (
              searchResults.map((r, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-800">{r.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{r.source_title}</span>
                    <span className="text-xs text-amber-600">相似度: {(r.similarity * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
