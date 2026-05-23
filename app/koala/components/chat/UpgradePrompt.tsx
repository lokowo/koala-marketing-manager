'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  feature: string;
  remaining: number;
}

const UPGRADE_PERKS = [
  '解锁无限 AI 对话',
  '更多套磁信生成额度',
  '完整教授数据 & CV 定制',
];

export function UpgradePrompt({ feature, remaining }: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-500/10 dark:to-transparent border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <span className="text-sm">☕</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              你的{feature}免费次数已用完
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          升级你的 Koala PhD 计划即可解锁更多功能
        </p>

        <ul className="space-y-1.5">
          {UPGRADE_PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex gap-2">
        <Link
          href="/koala/pricing"
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors min-h-[44px]"
        >
          查看升级方案 →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors min-h-[44px]"
        >
          明天继续
        </button>
      </div>
    </div>
  );
}
