'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';

interface UpgradeAction {
  label: string;
  href: string;
}

interface UpgradePromptProps {
  feature: string;
  remaining: number;
  message?: string;
  actions?: UpgradeAction[];
}

const UPGRADE_PERKS = [
  '解锁无限 AI 对话',
  '更多套磁信生成额度',
  '完整教授数据 & CV 定制',
];

export function UpgradePrompt({ feature, remaining, message, actions }: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const defaultActions: UpgradeAction[] = [{ label: '升级订阅', href: '/koala/pricing' }];
  const ctaList = actions && actions.length > 0 ? actions : defaultActions;

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-[#c9a96e]/20 bg-white dark:bg-[#0d1520] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-[#c9a96e]/10 dark:to-transparent border-b border-gray-200 dark:border-[#c9a96e]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-[#c9a96e]/20 flex items-center justify-center">
              <span className="text-sm">☕</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-[#e8e4dc]">
              {message || `你的${feature}免费次数已用完`}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:text-[#8a8078] dark:hover:text-[#e8e4dc] transition-colors"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-gray-500 dark:text-[#8a8078]">
          升级你的 Koala PhD 计划即可解锁更多功能
        </p>

        <ul className="space-y-1.5">
          {UPGRADE_PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm text-gray-700 dark:text-[#a8b8ac]">
              <Sparkles size={14} className="text-amber-500 dark:text-[#c9a96e] shrink-0" />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-[#c9a96e]/10 bg-gray-50/50 dark:bg-white/[0.02] flex gap-2">
        {ctaList.map((action, i) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
              i === 0
                ? 'bg-[#1A1A2E] dark:bg-[#c9a96e] text-white dark:text-[#080c10] hover:opacity-90'
                : 'border border-gray-200 dark:border-[#c9a96e]/20 text-gray-600 dark:text-[#c9a96e] bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
            }`}
          >
            {action.label}
          </Link>
        ))}
        {ctaList.length === 1 && (
          <button
            onClick={() => setDismissed(true)}
            className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-[#c9a96e]/20 text-gray-600 dark:text-[#8a8078] bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors min-h-[44px]"
          >
            明天继续
          </button>
        )}
      </div>
    </div>
  );
}
