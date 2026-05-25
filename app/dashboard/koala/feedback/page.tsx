'use client';
import { useState, useEffect } from 'react';

interface ModeStats {
  helpful: number;
  partial: number;
  unhelpful: number;
  total: number;
}

interface FeedbackData {
  total: number;
  helpful: number;
  partial: number;
  unhelpful: number;
  byMode: Record<string, ModeStats>;
}

function pct(part: number, total: number): string {
  if (total === 0) return '—';
  return Math.round((part / total) * 100) + '%';
}

export default function FeedbackPage() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/feedback-stats')
      .then(r => {
        if (!r.ok) throw new Error('加载失败');
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message || '加载失败'); setLoading(false); });
  }, []);

  const MODES = [
    { key: 'path', label: '路径评估' },
    { key: 'research', label: '科研深潜' },
    { key: 'chat', label: '陪伴模式' },
    { key: 'write', label: '文案模式' },
  ];

  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-gray-100">反馈分析</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">AI 回复质量监控与优化建议</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm animate-pulse">
              <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-100 dark:bg-gray-700/50 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '总反馈数', value: String(total), color: 'text-gray-800 dark:text-gray-200' },
            { label: '👍 有帮助', value: pct(data?.helpful ?? 0, total), color: 'text-green-600' },
            { label: '🤔 一般', value: pct(data?.partial ?? 0, total), color: 'text-amber-600' },
            { label: '👎 没帮助', value: pct(data?.unhelpful ?? 0, total), color: 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className={`text-2xl font-medium ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">按模式统计</h3>
          {loading ? (
            <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">加载中...</div>
          ) : (
            <div className="space-y-3">
              {MODES.map(mode => {
                const s = data?.byMode?.[mode.key];
                const modeTotal = s?.total ?? 0;
                const helpfulPct = modeTotal ? Math.round((s?.helpful ?? 0) / modeTotal * 100) : 0;
                return (
                  <div key={mode.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{mode.label}</span>
                      <span className="text-gray-400 dark:text-gray-500">{modeTotal} 条反馈</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${helpfulPct}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">有帮助率 {modeTotal > 0 ? `${helpfulPct}%` : '—'}</div>
                  </div>
                );
              })}
              {total === 0 && (
                <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                  <p>暂无反馈数据</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">用户对 AI 回复评分后将显示在此</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">数据概览</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400">总反馈数</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{total}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400">有帮助</span>
              <span className="text-sm font-medium text-green-600">{data?.helpful ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-600 dark:text-gray-400">一般</span>
              <span className="text-sm font-medium text-amber-600">{data?.partial ?? 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">没帮助</span>
              <span className="text-sm font-medium text-red-500">{data?.unhelpful ?? 0}</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">💡 知识库更新建议</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-1">
              {total >= 50 ? '已有足够数据，可以分析高频问题优化知识库' : '当有足够反馈数据时将自动生成'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
