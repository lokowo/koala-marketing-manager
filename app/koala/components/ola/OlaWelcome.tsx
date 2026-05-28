'use client';

import { OlaAvatar } from './OlaAvatar';

const DEFAULT_QUICK_ACTIONS = [
  { icon: '🔍', label: '找导师', message: '帮我匹配适合的澳洲PhD导师' },
  { icon: '✉️', label: '写套磁信', message: '帮我给教授写一封套磁信' },
  { icon: '📄', label: '审文书', message: '帮我审阅CV/RP' },
  { icon: '🎤', label: '模拟面试', message: '帮我做一次PhD面试模拟' },
];

interface OlaWelcomeProps {
  onSend: (message: string) => void;
  olaAssetId?: string;
  quickActions?: Array<{ icon: string; label: string; message: string }>;
}

export function OlaWelcome({ onSend, olaAssetId, quickActions }: OlaWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10">
      <div key={olaAssetId} style={{ animation: 'fadeIn 0.3s ease-out' }}>
        <OlaAvatar assetId={olaAssetId ?? 'h-03-encouragement-nobg'} size="lg" round={false} className="w-[200px] h-auto" enableZoom />
      </div>
      <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-[#e8e4dc]">
        嗨！我是学姐小欧 ✨
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-[#8a8078]">
        你的 PhD 申请 AI 顾问，我能帮你：
      </p>
      <div className="grid grid-cols-2 gap-2.5 mt-5 w-full max-w-[320px]">
        {(quickActions ?? DEFAULT_QUICK_ACTIONS).map(action => (
          <button
            key={action.label}
            onClick={() => onSend(action.message)}
            className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all active:scale-[0.97] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#D4A843]/40 dark:hover:border-[#D4A843]/30"
          >
            <span className="text-xl flex-shrink-0">{action.icon}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-[#e8e4dc]">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
