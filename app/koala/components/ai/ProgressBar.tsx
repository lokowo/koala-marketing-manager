'use client';

interface ProgressBarProps {
  score: number; // 0-100
  label?: string;
  showDimensions?: boolean;
  dimensions?: Array<{ name: string; score: number }>;
  compact?: boolean;
}

export function ProgressBar({ score, label = 'Research Readiness', showDimensions = false, dimensions = [], compact = false }: ProgressBarProps) {
  const color = score >= 70 ? '#5a8060' : score >= 50 ? '#c9a96e' : '#b06040';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] flex-shrink-0" style={{ color: '#6a7a7e' }}>{label}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(201,169,110,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="text-[11px] font-bold flex-shrink-0" style={{ color }}>{score}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,169,110,0.1)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: '#e8e4dc' }}>📊 {label}</span>
        <span className="text-xl font-bold" style={{ color }}>{score}<span className="text-xs font-normal" style={{ color: '#b09878' }}>/100</span></span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(201,169,110,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      {showDimensions && dimensions.length > 0 && (
        <div className="space-y-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(201,169,110,0.06)' }}>
          {dimensions.map(d => (
            <div key={d.name}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span style={{ color: '#a8b8ac' }}>{d.name}</span>
                <span style={{ color: '#c9a96e' }}>{d.score}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(201,169,110,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: '#c9a96e' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
