'use client';

import { OlaAvatar } from './OlaAvatar';

interface OlaLoadingProps {
  lang?: 'zh' | 'en';
  className?: string;
}

export function OlaLoading({ lang = 'zh', className }: OlaLoadingProps) {
  const text = lang === 'en' ? 'Ola is thinking' : '小欧正在思考';

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <OlaAvatar state="thinking" size="lg" />
      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-[#8a8078]">
        <span>{text}</span>
        <span className="inline-flex gap-0.5">
          <span className="animate-[olaDot_1.4s_ease-in-out_infinite] inline-block w-1 h-1 rounded-full bg-gray-400 dark:bg-[#6a6058]" />
          <span className="animate-[olaDot_1.4s_ease-in-out_0.2s_infinite] inline-block w-1 h-1 rounded-full bg-gray-400 dark:bg-[#6a6058]" />
          <span className="animate-[olaDot_1.4s_ease-in-out_0.4s_infinite] inline-block w-1 h-1 rounded-full bg-gray-400 dark:bg-[#6a6058]" />
        </span>
      </div>
      <style>{`
        @keyframes olaDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
