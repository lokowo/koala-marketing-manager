'use client';

interface ProgressBarProps {
  score: number; // 0-100
  label?: string;
  showDimensions?: boolean;
  dimensions?: Array<{ name: string; score: number }>;
  compact?: boolean;
}

export function ProgressBar({ score, label = 'Research Readiness', showDimensions = false, dimensions = [], compact = false }: ProgressBarProps) {
  const color = score >= 70 ? '#5a8060' : score >= 50 ? '#c4a050' : '#b06040';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] flex-shrink-0" style={{ color: '#907858' }}>{label}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e8dcc8' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="text-[11px] font-bold flex-shrink-0" style={{ color }}>{score}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: '#1a2332' }}>📊 {label}</span>
        <span className="text-xl font-bold" style={{ color }}>{score}<span className="text-xs font-normal" style={{ color: '#b09878' }}>/100</span></span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#f0e8d4' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      {showDimensions && dimensions.length > 0 && (
        <div className="space-y-1.5 mt-2 pt-2" style={{ borderTop: '1px solid #f0e8d4' }}>
          {dimensions.map(d => (
            <div key={d.name}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span style={{ color: '#584838' }}>{d.name}</span>
                <span style={{ color: '#7d6340' }}>{d.score}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: '#f0e8d4' }}>
                <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: '#c4a050' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
