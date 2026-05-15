'use client';

import { OlaAvatar } from './OlaAvatar';

interface OlaWidgetProps {
  onClick: () => void;
  className?: string;
}

export function OlaWidget({ onClick, className }: OlaWidgetProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full p-0.5 border-2 border-[#0D7C5F] bg-white dark:bg-[#0a0e14] shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 ${className ?? ''}`}
      aria-label="Open Ola AI chat"
    >
      <OlaAvatar state="welcome" size="md" className="rounded-full" />
    </button>
  );
}
