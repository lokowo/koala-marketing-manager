'use client';

interface QuestionStat {
  question_id: string;
  question_title: string;
  question_type: string;
  answer_distribution: Record<string, number>;
  text_answers?: string[];
}

interface AnalyticsData {
  total_responses: number;
  completion_rate: number;
  avg_completion_time_seconds: number;
  responses_by_day: Array<{ date: string; count: number }>;
  responses_by_source: Array<{ source: string; count: number }>;
  question_stats: QuestionStat[];
}

interface AnalyticsChartsProps {
  data: AnalyticsData;
  brandColor?: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function HorizontalBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-28 truncate flex-shrink-0" title={label}>{label}</span>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm text-slate-500 w-12 text-right">{count}</span>
    </div>
  );
}

export default function AnalyticsCharts({ data, brandColor = '#D4A843' }: AnalyticsChartsProps) {
  const avgMinutes = data.avg_completion_time_seconds > 0
    ? `${Math.floor(data.avg_completion_time_seconds / 60)}分${data.avg_completion_time_seconds % 60}秒`
    : '—';

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总回复数" value={data.total_responses} />
        <StatCard label="完成率" value={`${data.completion_rate}%`} />
        <StatCard label="平均用时" value={avgMinutes} />
        <StatCard label="渠道数" value={data.responses_by_source.length} />
      </div>

      {/* Daily responses */}
      {data.responses_by_day.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">每日回复趋势</h3>
          <div className="flex items-end gap-1 h-32">
            {data.responses_by_day.map((d, i) => {
              const maxCount = Math.max(...data.responses_by_day.map(x => x.count));
              const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400">{d.count}</span>
                  <div
                    className="w-full rounded-t-sm transition-all duration-300"
                    style={{ height: `${Math.max(height, 4)}%`, backgroundColor: brandColor }}
                  />
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source distribution */}
      {data.responses_by_source.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">来源分布</h3>
          <div className="space-y-2">
            {data.responses_by_source.map((s, i) => {
              const max = Math.max(...data.responses_by_source.map(x => x.count));
              const sourceLabels: Record<string, string> = { direct: '直接访问', qrcode: '二维码扫码' };
              return (
                <HorizontalBar
                  key={i}
                  label={sourceLabels[s.source] || s.source}
                  count={s.count}
                  max={max}
                  color={brandColor}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Per-question stats */}
      {data.question_stats.map((qs) => {
        const entries = Object.entries(qs.answer_distribution).sort((a, b) => b[1] - a[1]);
        const maxVal = entries.length > 0 ? Math.max(...entries.map(e => e[1])) : 0;

        return (
          <div key={qs.question_id} className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">{qs.question_title}</h3>
            <span className="text-xs text-slate-400 mb-3 block">
              {qs.question_type === 'text' ? '文本题' : qs.question_type === 'rating' ? '评分题' : '选择题'}
            </span>

            {qs.question_type === 'text' && qs.text_answers ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {qs.text_answers.map((txt, i) => (
                  <div key={i} className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{txt}</div>
                ))}
              </div>
            ) : entries.length > 0 ? (
              <div className="space-y-2">
                {entries.map(([label, count], i) => (
                  <HorizontalBar key={i} label={label} count={count} max={maxVal} color={brandColor} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">暂无数据</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
