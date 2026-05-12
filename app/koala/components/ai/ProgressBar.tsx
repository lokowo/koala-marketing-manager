'use client';

interface ProgressBarProps {
  score: number; // 0-100
  label?: string;
  showDimensions?: boolean;
  dimensions?: Array<{ name: string; score: number }>;
  compact?: boolean;
}

export function ProgressBar({ score, label = 'Research Readiness', showDimensions = false, dimensions = [], compact = false }: ProgressBarProps) {
  const color = score >= 70 ? '#5a8060' : score >= 50 ? '#D4A843' : '#b06040';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] flex-shrink-0 text-gray-500 dark:text-[#6a7a7e]">{label}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#D4A843]/10">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="text-[11px] font-bold flex-shrink-0" style={{ color }}>{score}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-900 dark:text-[#e8e4dc]">📊 {label}</span>
        <span className="text-xl font-bold" style={{ color }}>
          {score}
          <span className="text-xs font-normal text-gray-500 dark:text-[#b09878]">/100</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-2 bg-[#D4A843]/[0.06]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      {showDimensions && dimensions.length > 0 && (
        <div className="space-y-1.5 mt-2 pt-2 border-t border-[#D4A843]/[0.06]">
          {dimensions.map(d => (
            <div key={d.name}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-gray-700 dark:text-[#a8b8ac]">{d.name}</span>
                <span className="text-[#D4A843]">{d.score}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden bg-[#D4A843]/[0.06]">
                <div className="h-full rounded-full bg-[#D4A843]" style={{ width: `${d.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
