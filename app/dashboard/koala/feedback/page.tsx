'use client';
import { useState, useEffect } from 'react';

interface FeedbackStats {
  helpful: number;
  thinking: number;
  unhelpful: number;
  total: number;
}

export default function FeedbackPage() {
  const [stats, setStats] = useState<Record<string, FeedbackStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Would fetch from /api/feedback/stats in production
    setStats({});
    setLoading(false);
  }, []);

  const MODES = [
    { key: 'path', label: '路径评估' },
    { key: 'research', label: '科研深潜' },
    { key: 'chat', label: '陪伴模式' },
    { key: 'write', label: '文案模式' },
  ];

  const topQuestions = [
    { question: 'TFS 奖学金申请要求', count: 0, mode: 'path' },
    { question: '澳洲PhD申请时间线', count: 0, mode: 'path' },
    { question: '申请信如何写', count: 0, mode: 'write' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">反馈分析</h1>
        <p className="text-sm text-gray-500 mt-1">AI 回复质量监控与优化建议</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '总反馈数', value: '0', icon: '📊', color: 'text-gray-900' },
          { label: '👍 有帮助', value: '0%', icon: '', color: 'text-green-600' },
          { label: '🤔 一般', value: '0%', icon: '', color: 'text-yellow-600' },
          { label: '👎 没帮助', value: '0%', icon: '', color: 'text-red-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.icon}{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">按模式统计</h2>
          {loading ? (
            <div className="text-center text-gray-400 py-4">加载中...</div>
          ) : (
            <div className="space-y-3">
              {MODES.map(mode => {
                const s = stats[mode.key];
                const total = s?.total ?? 0;
                const helpfulPct = total ? Math.round((s?.helpful ?? 0) / total * 100) : 0;
                return (
                  <div key={mode.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{mode.label}</span>
                      <span className="text-gray-500">{total} 条反馈</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${helpfulPct}%` }} />
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">有帮助率 {helpfulPct}%</div>
                  </div>
                );
              })}
              {Object.keys(stats).length === 0 && (
                <div className="text-center text-gray-400 py-4">
                  <p>暂无反馈数据</p>
                  <p className="text-xs mt-1">用户对 AI 回复评分后将显示在此</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">高频问题排行</h2>
          <div className="space-y-2">
            {topQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-lg font-bold text-gray-300">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{q.question}</p>
                  <p className="text-xs text-gray-400">{q.mode} · {q.count} 次</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">💡 知识库更新建议</p>
            <p className="text-xs text-blue-600 mt-1">暂无建议 — 当有足够反馈数据时将自动生成</p>
          </div>
        </div>
      </div>
    </div>
  );
}
