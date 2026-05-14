'use client';

interface MiniStatsProps {
  readinessScore?: number;
  emailsSent?: number;
  professorsMatched?: number;
  creditsRemaining?: number;
  compact?: boolean;
}

export function MiniStats({
  readinessScore,
  emailsSent = 0,
  professorsMatched = 0,
  creditsRemaining = 0,
  compact = false,
}: MiniStatsProps) {
  const items = [
    { label: '积分', value: creditsRemaining, icon: '⭐', colorClass: 'text-amber-600 dark:text-[#D4A843]' },
    { label: '匹配', value: professorsMatched, icon: '🎯', colorClass: 'text-[#5a8060]' },
    { label: '已发', value: emailsSent, icon: '✉️', colorClass: 'text-amber-600 dark:text-[#D4A843]' },
    ...(readinessScore !== undefined ? [{ label: '评分', value: readinessScore, icon: '📊', colorClass: 'text-[#b06040]' }] : []),
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-1">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <span className="text-[11px]">{item.icon}</span>
            <span className={`text-[11px] font-semibold ${item.colorClass}`}>{item.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 px-4 pb-2">
      {items.map(item => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-xl py-2 bg-amber-50 dark:bg-[#D4A843]/10"
        >
          <span className="text-base">{item.icon}</span>
          <span className={`text-sm font-bold ${item.colorClass}`}>{item.value}</span>
          <span className="text-[10px] text-gray-500 dark:text-[#6a7a7e]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
