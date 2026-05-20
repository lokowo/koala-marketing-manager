'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const CATEGORIES: Record<string, string> = {
  phd_guide: 'PhD指南',
  application: '申请攻略',
  scholarship: '奖学金',
  visa: '签证攻略',
  supervisor: '导师关系',
  research: '科研方法',
  student_life: '留学生活',
  news: '行业新闻',
};

type GenStep = 'idle' | 'writing_zh' | 'translating' | 'seo' | 'done' | 'error' | 'slow';

export default function AIContentPage() {
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('phd_guide');
  const [style, setStyle] = useState('casual');
  const [publishMode, setPublishMode] = useState('draft');
  const [imageCount, setImageCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState<GenStep>('idle');
  const [result, setResult] = useState<{ success?: boolean; post?: { id: string; title_zh: string }; error?: string } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  async function handleGenerate() {
    if (!topic.trim()) return alert('请输入文章主题');
    setGenerating(true);
    setResult(null);
    setGenStep('writing_zh');
    startRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      setGenStep(prev => prev !== 'done' && prev !== 'error' ? 'slow' : prev);
    }, 60000);

    const stepTimer1 = setTimeout(() => {
      setGenStep(prev => prev === 'writing_zh' ? 'translating' : prev);
    }, 12000);

    const stepTimer2 = setTimeout(() => {
      setGenStep(prev => prev === 'translating' ? 'seo' : prev);
    }, 22000);

    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, category, style, publishMode, imageCount }),
      });
      const data = await res.json();
      setResult(data);
      setGenStep(data.success ? 'done' : 'error');
      if (data.success) setTopic('');
    } catch (e) {
      setResult({ error: String(e) });
      setGenStep('error');
    }

    clearTimeout(stepTimer1);
    clearTimeout(stepTimer2);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setGenerating(false);
  }

  const stepLabels: Record<GenStep, string> = {
    idle: '',
    writing_zh: '正在撰写中文...',
    translating: '正在翻译英文...',
    seo: '正在优化SEO...',
    done: '完成！',
    error: '生成失败',
    slow: '生成时间较长，请耐心等待...',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">AI 内容生成</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI 自动撰写中英双语文章，包含SEO优化</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('single')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'single' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          单篇生成
        </button>
        <Link
          href="/dashboard/koala/ai-content/batch"
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'batch' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          ⚡ 批量生成（推荐主题）
        </Link>
      </div>

      {/* Single Generate Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">发布方式</label>
            <select value={publishMode} onChange={e => setPublishMode(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
              <option value="draft">保存草稿</option>
              <option value="publish">直接发布</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">风格</label>
            <select value={style} onChange={e => setStyle(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
              <option value="professional">专业权威</option>
              <option value="casual">学长分享</option>
              <option value="news">新闻报道</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">文章主题 Topic</label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="例如：2026年澳洲PhD奖学金最新政策变化和申请攻略"
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">主题越具体，生成的文章质量越高。建议包含关键词、地区、时间等信息。</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">文章插图</label>
          <div className="flex gap-3">
            {[0, 1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setImageCount(n)}
                className={`px-3 py-1.5 text-sm rounded-lg border ${imageCount === n ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              >
                {n === 0 ? '无插图' : `${n}张`}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">插图AI自动生成，插入文章内容中</p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? '⏳ 生成中...' : '✨ 生成文章（中文撰写 → 英文翻译 → SEO优化）'}
        </button>

        {/* Generation Progress */}
        {generating && genStep !== 'idle' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-amber-800">{stepLabels[genStep]}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <p className={genStep === 'writing_zh' || genStep === 'slow' ? 'text-amber-700 font-medium' : genStep === 'translating' || genStep === 'seo' || genStep === 'done' ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}>
                {(genStep === 'translating' || genStep === 'seo' || genStep === 'done') ? '✅' : '⏳'} 1. 中文撰写
              </p>
              <p className={genStep === 'translating' ? 'text-amber-700 font-medium' : genStep === 'seo' || genStep === 'done' ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}>
                {(genStep === 'seo' || genStep === 'done') ? '✅' : genStep === 'translating' ? '⏳' : '⏸'} 2. 英文翻译
              </p>
              <p className={genStep === 'seo' ? 'text-amber-700 font-medium' : genStep === 'done' ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}>
                {genStep === 'done' ? '✅' : genStep === 'seo' ? '⏳' : '⏸'} 3. SEO优化
              </p>
            </div>
            {genStep === 'slow' && (
              <p className="text-xs text-amber-600 mt-2">⚠ 生成时间较长，请耐心等待...</p>
            )}
          </div>
        )}

        {/* Result */}
        {result && !generating && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <div>
                <p className="text-green-700 font-medium">✅ 文章生成成功！</p>
                <p className="text-sm text-green-600 mt-1">{result.post?.title_zh}</p>
                <p className="text-xs text-green-500 mt-0.5">
                  {publishMode === 'publish' ? '已发布' : '已保存为草稿'}
                </p>
                <div className="flex gap-3 mt-3">
                  {result.post?.id && (
                    <Link href={`/dashboard/koala/blog/edit?id=${result.post.id}`} className="text-sm text-amber-700 underline">
                      查看文章
                    </Link>
                  )}
                  <button
                    onClick={() => { setResult(null); setGenStep('idle'); }}
                    className="text-sm text-gray-600 dark:text-gray-400 underline"
                  >
                    继续生成
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-red-700 text-sm">❌ {result.error || '生成失败'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
