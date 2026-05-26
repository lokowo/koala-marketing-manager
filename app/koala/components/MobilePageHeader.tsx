'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export function MobilePageHeader({ title, backHref }: { title: string; backHref?: string }) {
  const router = useRouter();

  return (
    <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0e14]">
      <button
        onClick={() => backHref ? router.push(backHref) : router.back()}
        className="p-1 -ml-1 text-gray-600 dark:text-[#a8b8ac]"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-base font-semibold text-gray-900 dark:text-[#e8e4dc] truncate">{title}</h1>
    </div>
  );
}
