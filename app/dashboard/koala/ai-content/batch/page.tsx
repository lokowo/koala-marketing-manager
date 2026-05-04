'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Topic {
  title: string;
  category: string;
  style: string;
  source: string;
  sourceDate: string;
  reason: string;
  selected?: boolean;
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

const STYLE_LABELS: Record<string, string> = {
  professional: '专业权威',
  casual: '学长分享',
  news: '新闻报道',
};

export default function BatchGeneratePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newsCount, setNewsCount] = useState(0);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [publishMode, setPublishMode] = useState('draft');
  const [imageCount, setImageCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ title: string; status: string; error?: string }[] | null>(null);

  async function fetchTopics() {
    setLoadingTopics(true);
    setResults(null);
    try {
      const res = await fetch('/api/blog/topics?count=8');
      const data = await res.json();
      setTopics((data.topics || []).map((t: Topic) => ({ ...t, selected: true })));
      setNewsCount(data.newsCount || 0);
    } catch { /* ignore */ }
    setLoadingTopics(false);
  }

  useEffect(() => { fetchTopics(); }, []);

  function toggleTopic(idx: number) {
    setTopics(prev => prev.map((t, i) => i === idx ? { ...t, selected: !t.selected } : t));
  }

  function selectAll(val: boolean) {
    setTopics(prev => prev.map(t => ({ ...t, selected: val })));
  }

  const selectedCount = topics.filter(t => t.selected).length;

  async function handleBatchGenerate() {
    const selected = topics.filter(t => t.selected);
    if (selected.length === 0) return alert('请至少选择一篇主题');
    setGenerating(true);
    setResults(null);
    try {
      const res = await fetch('/api/blog/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: selected, publishMode, imageCount }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      setResults([{ title: '批量生成', status: 'error', error: String(e) }]);
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">⚡ 批量生成（推荐主题）</h2>
          <p className="text-sm text-gray-500 mt-1">基于 Google News 实时新闻推荐主题，一键生成中英双语文章</p>
        </div>
        <Link href="/dashboard/koala/ai-content" className="text-sm text-gray-500 hover:text-gray-700">← 单篇生成</Link>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">发布方式</label>
          <select value={publishMode} onChange={e => setPublishMode(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="draft">保存草稿</option>
            <option value="publish">直接发布</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">文章插图</label>
          <select value={String(imageCount)} onChange={e => setImageCount(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="0">无插图</option>
            <option value="1">1张</option>
            <option value="2">2张</option>
            <option value="3">3张</option>
          </select>
        </div>
      </div>

      {/* News Source Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          基于 Google + Bing 双源实时新闻推荐主题（<span className="font-medium text-amber-700">{newsCount} 条新闻源</span>）
        </p>
        <button
          onClick={fetchTopics}
          disabled={loadingTopics}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          🔄 刷新主题
        </button>
      </div>

      {/* Topics List */}
      {loadingTopics ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">暂无推荐主题，请点击刷新</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((topic, idx) => (
            <div
              key={idx}
              onClick={() => toggleTopic(idx)}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition border-2 ${
                topic.selected ? 'border-amber-300 bg-amber-50/30' : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={topic.selected || false}
                  onChange={() => toggleTopic(idx)}
                  className="mt-1 accent-amber-600"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{topic.title}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                      {CATEGORY_LABELS[topic.category] || topic.category}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {STYLE_LABELS[topic.style] || topic.style}
                    </span>
                    <span className="text-xs text-gray-400">
                      来源：{topic.source} · {topic.sourceDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Actions */}
      {topics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between sticky bottom-4">
          <div className="flex items-center gap-3">
            <button onClick={() => selectAll(true)} className="text-sm text-amber-600 hover:text-amber-700">全选</button>
            <button onClick={() => selectAll(false)} className="text-sm text-gray-500 hover:text-gray-700">取消全选</button>
            <span className="text-sm text-gray-600">已选 <span className="font-medium text-amber-700">{selectedCount}</span> 篇（预计 {selectedCount * 30}-{selectedCount * 60} 秒）</span>
          </div>
          <button
            onClick={handleBatchGenerate}
            disabled={generating || selectedCount === 0}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {generating ? '⏳ 生成中...' : `⚡ 一键生成 ${selectedCount} 篇文章（${publishMode === 'draft' ? '草稿' : '发布'}）`}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg shadow p-4 space-y-2">
          <h4 className="font-medium text-gray-900 mb-3">生成结果</h4>
          {results.map((r, i) => (
            <div key={i} className={`flex items-center justify-between p-2 rounded ${r.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className="text-sm text-gray-700 truncate flex-1">{r.title}</span>
              <span className={`text-xs ${r.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {r.status === 'success' ? '✅ 成功' : `❌ ${r.error || '失败'}`}
              </span>
            </div>
          ))}
          <Link href="/dashboard/koala/blog" className="text-sm text-amber-700 underline mt-3 inline-block">
            → 前往博客管理查看
          </Link>
        </div>
      )}
    </div>
  );
}
