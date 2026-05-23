'use client';

import { useState, useEffect } from 'react';

interface Overview {
  total: number;
  interested_count: number;
  interested_pct: number;
  not_suitable_count: number;
  not_suitable_pct: number;
}

interface ByProfessor {
  professor_id: string;
  professor_name: string;
  university: string;
  total: number;
  interested: number;
  not_suitable: number;
  interested_rate: number;
}

interface ByGroup {
  university_group?: string;
  range?: string;
  total: number;
  interested: number;
  not_suitable: number;
  interested_rate: number;
}

interface DataReadiness {
  total_feedback: number;
  ready_for_training: boolean;
}

interface ReportData {
  overview: Overview;
  by_professor: ByProfessor[];
  by_university_group: ByGroup[];
  by_gpa_range: ByGroup[];
  data_readiness: DataReadiness;
}

export default function FeedbackFlywheelPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/feedback-report')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        无法加载报告数据
      </div>
    );
  }

  const { overview, by_professor, by_university_group, by_gpa_range, data_readiness } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light tracking-tight text-gray-900">反馈飞轮报告</h2>
        <p className="text-sm text-gray-500 mt-0.5">教授反馈数据统计，为匹配算法优化提供基础</p>
      </div>

      {/* Data Readiness Banner */}
      <div className={`rounded-xl border p-4 ${
        data_readiness.ready_for_training
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{data_readiness.ready_for_training ? '✅' : '📊'}</span>
          <div>
            <p className={`text-sm font-medium ${data_readiness.ready_for_training ? 'text-green-800' : 'text-amber-800'}`}>
              {data_readiness.ready_for_training
                ? '数据量已达标，可启动匹配偏好模型训练'
                : `数据量达到 500 条后可启动匹配偏好模型训练`
              }
            </p>
            <p className={`text-xs mt-0.5 ${data_readiness.ready_for_training ? 'text-green-600' : 'text-amber-600'}`}>
              当前: {data_readiness.total_feedback} / 500 条反馈
            </p>
          </div>
        </div>
        {!data_readiness.ready_for_training && (
          <div className="mt-2 h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${Math.min((data_readiness.total_feedback / 500) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Overview KPI */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-2xl font-light text-gray-900">{overview.total}</div>
          <div className="text-xs text-gray-500 mt-1">总反馈数</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-2xl font-light text-green-600">{overview.interested_pct}%</div>
          <div className="text-xs text-gray-500 mt-1">感兴趣 ({overview.interested_count})</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-2xl font-light text-red-500">{overview.not_suitable_pct}%</div>
          <div className="text-xs text-gray-500 mt-1">不合适 ({overview.not_suitable_count})</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Professor */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">按教授统计 (Top 20)</h3>
          {by_professor.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">暂无数据</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {by_professor.map((prof, i) => (
                <div key={prof.professor_id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold text-gray-300 w-5 text-right">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{prof.professor_name}</div>
                    <div className="text-[10px] text-gray-400">{prof.university}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-700">{prof.total} 条</div>
                    <div className="text-[10px] text-green-600">{prof.interested_rate}% 感兴趣</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By University Group */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">按学生院校分组</h3>
          {by_university_group.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {by_university_group.map(g => (
                <div key={g.university_group || 'unknown'}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{g.university_group || 'Unknown'}</span>
                    <span className="text-gray-400">{g.total} 条 · {g.interested_rate}% 感兴趣</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${g.interested_rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By GPA Range */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">按 GPA 区间</h3>
          {by_gpa_range.every(g => g.total === 0) ? (
            <div className="text-center text-sm text-gray-400 py-8">暂无数据</div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {by_gpa_range.map(g => (
                <div key={g.range} className="text-center">
                  <div className="text-xs font-medium text-gray-600 mb-2">{g.range}</div>
                  <div className="relative h-24 bg-gray-50 rounded-lg flex items-end justify-center pb-2">
                    <div
                      className="w-8 bg-blue-400 rounded-t"
                      style={{ height: `${Math.max(g.total > 0 ? (g.interested_rate / 100) * 80 : 0, 4)}px` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{g.total} 条</div>
                  <div className="text-[10px] text-green-600">{g.interested_rate}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
