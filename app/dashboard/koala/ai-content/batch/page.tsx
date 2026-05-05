'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Topic {
  id: string;
  title: string;
  category: string;
  style: string;
  source: string;
  sourceDate: string;
  reason: string;
}

interface GenerationItem {
  title: string;
  status: 'pending' | 'generating' | 'success' | 'failed' | 'cancelled';
  error?: string;
  postId?: string;
  publishStatus?: string;
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
  professor_spotlight: '教授推荐',
};

const STYLE_LABELS: Record<string, string> = {
  professional: '专业权威',
  casual: '学长分享',
  news: '新闻报道',
};

export default function BatchGeneratePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newsCount, setNewsCount] = useState(0);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [publishMode, setPublishMode] = useState('draft');
  const [imageCount, setImageCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<GenerationItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const [stopped, setStopped] = useState(false);

  async function fetchTopics() {
    setLoadingTopics(true);
    setItems([]);
    setStopped(false);
    try {
      const res = await fetch('/api/blog/topics?count=8');
      const data = await res.json();
      const loadedTopics = (data.topics || []).map((t: any, i: number) => ({
        ...t,
        id: `topic-${i}-${Date.now()}`,
      }));
      setTopics(loadedTopics);
      setSelectedIds(new Set());
      setNewsCount(data.newsCount || 0);
    } catch { /* ignore */ }
    setLoadingTopics(false);
  }

  useEffect(() => { fetchTopics(); }, []);

  function toggleTopic(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(topics.map(t => t.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const selectedCount = selectedIds.size;

  async function handleBatchGenerate() {
    const selected = topics.filter(t => selectedIds.has(t.id));
    if (selected.length === 0) return alert('请至少选择一篇主题');

    setGenerating(true);
    setStopped(false);
    setCompletedCount(0);

    const initialItems: GenerationItem[] = selected.map(t => ({
      title: t.title,
      status: 'pending',
    }));
    setItems(initialItems);

    const controller = new AbortController();
    abortRef.current = controller;

    let done = 0;
    for (let i = 0; i < selected.length; i++) {
      if (controller.signal.aborted) {
        setItems(prev => prev.map((item, idx) =>
          idx >= i ? { ...item, status: 'cancelled' } : item
        ));
        break;
      }

      setItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'generating' } : item
      ));

      try {
        const res = await fetch('/api/blog/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: selected[i].title,
            category: selected[i].category,
            style: selected[i].style,
            publishMode,
            imageCount,
          }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.success) {
          done++;
          setCompletedCount(done);
          setItems(prev => prev.map((item, idx) =>
            idx === i ? {
              ...item,
              status: 'success',
              postId: data.post?.id,
              publishStatus: publishMode === 'publish' ? '已发布' : '已存为草稿',
            } : item
          ));
        } else {
          setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'failed', error: data.error || '生成失败' } : item
          ));
        }
      } catch (e) {
        if (controller.signal.aborted) {
          setItems(prev => prev.map((item, idx) =>
            idx >= i ? { ...item, status: 'cancelled' } : item
          ));
          break;
        }
        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'failed', error: (e as Error).message } : item
        ));
      }
    }

    if (controller.signal.aborted) {
      setStopped(true);
    }
    setGenerating(false);
    abortRef.current = null;
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const totalItems = items.length;
  const successItems = items.filter(i => i.status === 'success').length;
  const progressPct = totalItems > 0 ? (successItems / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">⚡ 批量生成（推荐主题）</h2>
          <p className="text-sm text-gray-500 mt-1">基于 AI 实时搜索推荐主题，一键生成中英双语文章</p>
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

      {/* Generation Progress */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {generating ? '生成进度' : stopped ? `已停止：完成 ${successItems}/${totalItems} 篇` : `生成完成：${successItems}/${totalItems} 篇`}
            </h4>
            {generating && (
              <button
                onClick={handleStop}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
              >
                ⏹ 停止生成
              </button>
            )}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">已完成 {successItems}/{totalItems} 篇</p>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {items.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${
                item.status === 'success' ? 'bg-green-50' :
                item.status === 'failed' ? 'bg-red-50' :
                item.status === 'generating' ? 'bg-amber-50' :
                item.status === 'cancelled' ? 'bg-gray-50' : 'bg-white'
              }`}>
                <span className="w-5 text-center">
                  {item.status === 'success' && '✅'}
                  {item.status === 'generating' && '⏳'}
                  {item.status === 'pending' && '⏸'}
                  {item.status === 'failed' && '❌'}
                  {item.status === 'cancelled' && '⏹'}
                </span>
                <span className="text-gray-500 text-xs w-10">[{i + 1}/{totalItems}]</span>
                <span className="flex-1 truncate text-gray-800">{item.title}</span>
                <span className="text-xs whitespace-nowrap">
                  {item.status === 'success' && <span className="text-green-600">{item.publishStatus}</span>}
                  {item.status === 'generating' && <span className="text-amber-600 animate-pulse">中文撰写→英文翻译→SEO优化</span>}
                  {item.status === 'pending' && <span className="text-gray-400">等待中</span>}
                  {item.status === 'failed' && <span className="text-red-600">{item.error}</span>}
                  {item.status === 'cancelled' && <span className="text-gray-400">已取消</span>}
                </span>
              </div>
            ))}
          </div>

          {!generating && successItems > 0 && (
            <Link href="/dashboard/koala/blog" className="text-sm text-amber-700 underline mt-2 inline-block">
              → 前往博客管理查看
            </Link>
          )}
        </div>
      )}

      {/* News Source Header */}
      {!generating && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              基于 AI 实时搜索推荐主题（<span className="font-medium text-amber-700">{newsCount} 条新闻源</span>）
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
              {topics.map(topic => (
                <div
                  key={topic.id}
                  className={`bg-white rounded-lg shadow p-4 transition border-2 ${
                    selectedIds.has(topic.id) ? 'border-amber-300 bg-amber-50/30' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(topic.id)}
                      onChange={() => toggleTopic(topic.id)}
                      className="mt-1 accent-amber-600 cursor-pointer"
                    />
                    <div className="flex-1 cursor-pointer" onClick={() => toggleTopic(topic.id)}>
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
                <button onClick={selectAll} className="text-sm text-amber-600 hover:text-amber-700">全选</button>
                <button onClick={deselectAll} className="text-sm text-gray-500 hover:text-gray-700">取消全选</button>
                <span className="text-sm text-gray-600">已选 <span className="font-medium text-amber-700">{selectedCount}</span> 篇（预计 {selectedCount * 20}-{selectedCount * 40} 秒）</span>
              </div>
              <button
                onClick={handleBatchGenerate}
                disabled={generating || selectedCount === 0}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                ⚡ 一键生成 {selectedCount} 篇文章（{publishMode === 'draft' ? '草稿' : '发布'}）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
