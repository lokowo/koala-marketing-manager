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
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)' }}>
      <div className="p-3" style={{ background: 'linear-gradient(135deg, #e8e4dc, #2a3442)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white/90">🎓 教授匹配报告</div>
            {studentName && <div className="text-[11px] text-white/60 mt-0.5">{studentName}</div>}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#c9a96e' }}>{overallScore}</div>
            <div className="text-[10px] text-white/60">综合评分</div>
          </div>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(201,169,110,0.06)' }}>
        {matches.map((m, i) => (
          <div key={i}>
            <button
              className="w-full flex items-center justify-between p-3 text-left"
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: i === 0 ? '#c9a96e' : i === 1 ? '#a08058' : '#c9a96e' }}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>{m.name}</div>
                  <div className="text-[10px]" style={{ color: '#6a7a7e' }}>{m.institution}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: m.matchScore >= 75 ? '#5a8060' : '#c9a96e' }}>{m.matchScore}%</span>
                <span className="text-[11px]" style={{ color: '#b09878' }}>{expandedIdx === i ? '▲' : '▼'}</span>
              </div>
            </button>

            {expandedIdx === i && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-[11px] leading-relaxed" style={{ color: '#a8b8ac' }}>{m.reason}</p>

                {m.grants && m.grants.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold mb-1" style={{ color: '#c9a96e' }}>🔬 在研项目</div>
                    {m.grants.map((g, j) => (
                      <div key={j} className="text-[10px] leading-snug" style={{ color: '#a8b8ac' }}>
                        {g.id && <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(201,169,110,0.06)', color: '#6a7a7e' }}>{g.id}</span>} {g.title} {g.amount && <span style={{ color: '#c9a96e' }}>({g.amount})</span>}
                      </div>
                    ))}
                  </div>
                )}

                {m.papers && m.papers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold mb-1" style={{ color: '#c9a96e' }}>📄 近期论文</div>
                    {m.papers.map((p, j) => (
                      <a
                        key={j}
                        href={p.doi ? `https://doi.org/${p.doi}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] leading-snug mb-1 no-underline hover:underline"
                        style={{ color: '#5a8060' }}
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
        <div className="p-3" style={{ borderTop: '1px solid rgba(201,169,110,0.06)' }}>
          <button
            onClick={onExportPDF}
            className="w-full py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: '#c9a96e', color: '#080c10' }}
          >
            📥 导出完整报告 PDF
          </button>
          <p className="text-center text-[10px] mt-1.5" style={{ color: '#b09878' }}>
            仅供参考 · 请以院校官方信息为准
          </p>
        </div>
      )}
    </div>
  );
}
