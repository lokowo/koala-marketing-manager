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
        <h2 className="text-xl font-bold text-slate-900">反馈分析</h2>
        <p className="text-sm text-slate-500 mt-0.5">AI 回复质量监控与优化建议</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '总反馈数', value: '0', color: 'text-slate-800' },
          { label: '👍 有帮助', value: '0%', color: 'text-green-600' },
          { label: '🤔 一般', value: '0%', color: 'text-amber-600' },
          { label: '👎 没帮助', value: '0%', color: 'text-red-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">按模式统计</h3>
          {loading ? (
            <div className="text-center text-sm text-slate-400 py-4">加载中...</div>
          ) : (
            <div className="space-y-3">
              {MODES.map(mode => {
                const s = stats[mode.key];
                const total = s?.total ?? 0;
                const helpfulPct = total ? Math.round((s?.helpful ?? 0) / total * 100) : 0;
                return (
                  <div key={mode.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{mode.label}</span>
                      <span className="text-slate-400">{total} 条反馈</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${helpfulPct}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">有帮助率 {helpfulPct}%</div>
                  </div>
                );
              })}
              {Object.keys(stats).length === 0 && (
                <div className="text-center text-sm text-slate-400 py-4">
                  <p>暂无反馈数据</p>
                  <p className="text-xs text-slate-400 mt-1">用户对 AI 回复评分后将显示在此</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">高频问题排行</h3>
          <div className="space-y-2">
            {topQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm font-bold text-slate-300">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs text-slate-700">{q.question}</p>
                  <p className="text-[10px] text-slate-400">{q.mode} · {q.count} 次</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-[10px] text-blue-700 font-medium">💡 知识库更新建议</p>
            <p className="text-[10px] text-blue-600 mt-1">暂无建议 — 当有足够反馈数据时将自动生成</p>
          </div>
        </div>
      </div>
    </div>
  );
}
