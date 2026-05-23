'use client';

import { ThumbsUp, ThumbsDown, AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';

export interface ProfessorPreviewData {
  firstImpression: number;
  wouldReply: 'yes' | 'maybe' | 'no';
  wouldReplyReason: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  professorName: string;
  university: string;
}

function impressionColor(score: number) {
  if (score >= 8) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' };
  if (score >= 5) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' };
}

function impressionLabel(score: number) {
  if (score >= 9) return '非常感兴趣';
  if (score >= 7) return '值得一看';
  if (score >= 5) return '一般';
  if (score >= 3) return '可能跳过';
  return '直接删除';
}

const REPLY_CONFIG = {
  yes:   { label: '会回复', cls: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' },
  maybe: { label: '可能回复', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' },
  no:    { label: '不会回复', cls: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' },
} as const;

export function ProfessorPreviewCard({
  data,
  onOptimize,
}: {
  data: ProfessorPreviewData;
  onOptimize?: () => void;
}) {
  const ic = impressionColor(data.firstImpression);
  const reply = REPLY_CONFIG[data.wouldReply];

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center text-base font-medium text-blue-700 dark:text-blue-400 shrink-0">
          {data.professorName.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-900 dark:text-gray-100">教授视角预览</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{data.professorName} · {data.university}</div>
        </div>
      </div>

      {/* Score + Reply */}
      <div className="px-4 py-3 flex items-center gap-4 border-b border-gray-100 dark:border-white/5">
        <div className={`rounded-lg px-3 py-2 text-center ${ic.bg}`}>
          <div className={`text-2xl font-medium tabular-nums ${ic.text}`}>{data.firstImpression}</div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">第一印象</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">会回复吗？</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${reply.cls}`}>
              {reply.label}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{data.wouldReplyReason}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{impressionLabel(data.firstImpression)}</p>
        </div>
      </div>

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp size={13} className="text-green-500 dark:text-green-400" />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">打动教授的地方</span>
          </div>
          <ul className="space-y-1.5">
            {data.strengths.map((s, i) => (
              <li key={i} className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed flex items-start gap-2">
                <span className="text-green-500 dark:text-green-400 mt-0.5 shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {data.weaknesses.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle size={13} className="text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">不够有说服力的地方</span>
          </div>
          <ul className="space-y-1.5">
            {data.weaknesses.map((w, i) => (
              <li key={i} className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed flex items-start gap-2">
                <span className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0">−</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={13} className="text-blue-500 dark:text-blue-400" />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">改进建议</span>
          </div>
          <ol className="space-y-1.5">
            {data.suggestions.map((s, i) => (
              <li key={i} className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0 tabular-nums">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Optimize button */}
      {onOptimize && (
        <div className="px-4 py-3 bg-gray-50/50 dark:bg-white/[0.02]">
          <button
            onClick={onOptimize}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors min-h-[44px]"
          >
            <RefreshCw size={13} /> 根据建议优化套磁信
          </button>
        </div>
      )}
    </div>
  );
}
