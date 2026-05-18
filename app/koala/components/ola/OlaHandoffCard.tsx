'use client';

import { OlaAvatar } from './OlaAvatar';

interface OlaHandoffCardProps {
  onClose?: () => void;
}

export function OlaHandoffCard({ onClose }: OlaHandoffCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] dark:from-[#0a1f15] dark:to-[#0d2818] rounded-xl border border-[#bbf7d0] dark:border-[#166534] p-4 my-3">
      <div className="flex items-start gap-3">
        <OlaAvatar state="suggest" size="sm" />
        <div className="flex-1">
          <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
            我帮你整理了你的情况，顾问老师看到后能更快帮到你~
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">💬</span>
              <span className="text-gray-700 dark:text-gray-300">微信：</span>
              <span className="font-medium text-[#0D7C5F]">MissKoalaAu</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">📧</span>
              <span className="text-gray-700 dark:text-gray-300">邮箱：</span>
              <a href="mailto:info@koalaphd.com" className="font-medium text-[#0D7C5F] hover:underline">
                info@koalaphd.com
              </a>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="mt-3 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              我知道了
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
