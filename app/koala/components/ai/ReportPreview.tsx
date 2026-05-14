'use client';
import { useState } from 'react';

interface ReportMatch {
  name: string;
  positionTitle: string;
  institution: string;
  matchScore: number;
  reason: string;
  researchAreas: string[];
  grants?: Array<{ title: string; id: string; amount: string }>;
  papers?: Array<{ title: string; journal: string; year: number; doi: string }>;
  proposalDirections?: string[];
}

interface ReportPreviewProps {
  studentName?: string;
  overallScore: number;
  matches: ReportMatch[];
  onExportPDF?: () => void;
}

export function ReportPreview({ studentName, overallScore, matches, onExportPDF }: ReportPreviewProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
      <div className="p-3 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#e8e4dc] dark:to-[#2a3442]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-900/90 dark:text-white/90">🎓 教授匹配报告</div>
            {studentName && <div className="text-[11px] text-gray-700/60 dark:text-white/60 mt-0.5">{studentName}</div>}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-[#D4A843]">{overallScore}</div>
            <div className="text-[10px] text-gray-700/60 dark:text-white/60">综合评分</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-amber-200/50 dark:divide-[#D4A843]/[0.06]">
        {matches.map((m, i) => (
          <div key={i}>
            <button
              className="w-full flex items-center justify-between p-3 text-left"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white dark:text-[#080c10] flex-shrink-0 bg-[#1A1A2E] dark:bg-[#D4A843]"
                >
                  {i + 1}
                </span>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">{m.name}</div>
                  <div className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">{m.institution}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${m.matchScore >= 75 ? 'text-[#5a8060]' : 'text-amber-600 dark:text-[#D4A843]'}`}>{m.matchScore}%</span>
                <span className="text-[11px] text-gray-500 dark:text-[#b09878]">{expandedIdx === i ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedIdx === i && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-[11px] leading-relaxed text-gray-700 dark:text-[#a8b8ac]">{m.reason}</p>

                {m.grants && m.grants.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold mb-1 text-amber-600 dark:text-[#D4A843]">🔬 在研项目</div>
                    {m.grants.map((g, j) => (
                      <div key={j} className="text-[10px] leading-snug text-gray-700 dark:text-[#a8b8ac]">
                        {g.id && <span className="text-[9px] px-1 rounded bg-amber-50 dark:bg-[#D4A843]/10 text-gray-500 dark:text-[#6a7a7e]">{g.id}</span>} {g.title} {g.amount && <span className="text-amber-600 dark:text-[#D4A843]">({g.amount})</span>}
                      </div>
                    ))}
                  </div>
                )}

                {m.papers && m.papers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold mb-1 text-amber-600 dark:text-[#D4A843]">📄 近期论文</div>
                    {m.papers.map((p, j) => (
                      <a
                        key={j}
                        href={p.doi ? `https://doi.org/${p.doi}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] leading-snug mb-1 no-underline hover:underline text-[#5a8060]"
                      >
                        {p.title} ({p.year})
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {onExportPDF && (
        <div className="p-3 border-t border-amber-200/50 dark:border-[#D4A843]/[0.06]">
          <button
            onClick={onExportPDF}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
          >
            📥 导出完整报告 PDF
          </button>
          <p className="text-center text-[10px] mt-1.5 text-gray-500 dark:text-[#b09878]">
            仅供参考 · 请以院校官方信息为准
          </p>
        </div>
      )}
    </div>
  );
}
