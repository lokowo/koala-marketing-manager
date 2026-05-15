'use client';

import Link from 'next/link';
import { OlaAvatar } from './OlaAvatar';

interface OlaEmptyProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function OlaEmpty({ message, actionLabel, actionHref, className }: OlaEmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center px-6 ${className ?? ''}`}>
      <OlaAvatar state="sleepy" size="lg" />
      <p className="mt-4 text-sm text-gray-600 dark:text-[#c8d0d4] leading-relaxed whitespace-pre-line">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium no-underline bg-[#1A1A2E] text-white dark:bg-[#D4A843] dark:text-[#080c10] transition-colors hover:opacity-90"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
