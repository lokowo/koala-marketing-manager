'use client';

import { useState, useEffect } from 'react';
import { OlaAvatar, type OlaState } from './OlaAvatar';

interface OlaProactiveBubbleProps {
  message: string;
  olaState: OlaState;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

export function OlaProactiveBubble({ message, olaState, actionLabel, onAction, onDismiss }: OlaProactiveBubbleProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => setCollapsed(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-3 h-3 rounded-full bg-[#0D7C5F] animate-pulse shadow-md"
        aria-label="Show Ola message"
      />
    );
  }

  return (
    <div
      className={`mb-2 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ maxWidth: 280 }}
    >
      <div className="bg-white dark:bg-[#1a2332] rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 relative">
        <button
          onClick={onDismiss}
          className="absolute top-1.5 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex gap-2.5 items-start">
          <div className="flex-shrink-0 mt-0.5">
            <OlaAvatar state={olaState} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed pr-4">{message}</p>
            {actionLabel && onAction && (
              <button
                onClick={onAction}
                className="mt-2 px-3 py-1.5 text-xs font-medium bg-[#0D7C5F] text-white rounded-full hover:bg-[#0a6a51] transition-colors"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>

        {/* Speech bubble tail */}
        <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-[#1a2332] border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45" />
      </div>
    </div>
  );
}
