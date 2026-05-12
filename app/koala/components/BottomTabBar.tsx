'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Users, BookOpen, Heart } from 'lucide-react';
import { APP_VERSION } from '../../lib/version';
import { useTheme } from '../../lib/theme';
const LEFT_TABS = [
  { href: '/koala/discover', icon: Compass, label: '发现' },
  { href: '/koala/professors', icon: Users, label: '教授' },
] as const;

const RIGHT_TABS = [
  { href: '/koala/blog', icon: BookOpen, label: '博客' },
  { href: '/koala/matches', icon: Heart, label: '匹配' },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();
  const { resolved: themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  function isActive(href: string) {
    if (href === '/koala/discover') return pathname === '/koala/discover' || pathname === '/koala/home' || pathname === '/koala';
    return pathname.startsWith(href);
  }

  const koalaHref = (pathname === '/koala/home' || pathname === '/koala') ? '/koala/chat' : '/koala/home';
  const koalaActive = pathname.startsWith('/koala/chat') || pathname === '/koala/home' || pathname === '/koala';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#0a0e14] border-t border-gray-200 dark:border-[rgba(201,169,110,0.12)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="text-center text-[9px] text-gray-300 dark:text-[#D4A843]/30 pt-0.5">{APP_VERSION}</div>
      <div className="relative flex justify-around items-end px-4 pb-6 pt-2 max-w-[480px] mx-auto">
        {LEFT_TABS.map(tab => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center flex-1 gap-1 no-underline">
              <Icon className={`size-5 ${active ? 'text-[#1A1A2E] dark:text-[#D4A843]' : 'text-gray-400 dark:text-[#5a6a6e]'}`} strokeWidth={active ? 2.2 : 1.5} />
              <span className={`text-[10px] tracking-wide ${active ? 'text-[#1A1A2E] dark:text-[#D4A843] font-semibold' : 'text-gray-400 dark:text-[#5a6a6e]'}`}>{tab.label}</span>
            </Link>
          );
        })}
        <div className="flex justify-center flex-1">
          <Link
            href={koalaHref}
            className={`size-14 rounded-full flex absolute -top-5 flex-col justify-center items-center no-underline border-2 shadow-lg ${
              koalaActive
                ? 'border-[#1A1A2E]/20 dark:border-[#D4A843]/30 shadow-[0_6px_20px_rgba(26,26,46,0.3)] dark:shadow-[0_6px_20px_rgba(212,168,67,0.4)]'
                : 'border-gray-200 dark:border-[#D4A843]/30 shadow-[0_4px_12px_rgba(26,26,46,0.2)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
            }`}
            style={{
              background: isDark
                ? koalaActive
                  ? 'linear-gradient(135deg, #D4A843, #a68540)'
                  : 'linear-gradient(135deg, #1a3a2a, #0d2818)'
                : '#1A1A2E',
            }}
          >
            <span className="text-xl leading-none">🐨</span>
            <span className={`font-semibold text-[9px] ${koalaActive ? 'text-white dark:text-[#0a0e14]' : 'text-white dark:text-[#D4A843]'}`}>Koala</span>
          </Link>
        </div>
        {RIGHT_TABS.map(tab => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center flex-1 gap-1 no-underline">
              <Icon className={`size-5 ${active ? 'text-[#1A1A2E] dark:text-[#D4A843]' : 'text-gray-400 dark:text-[#5a6a6e]'}`} strokeWidth={active ? 2.2 : 1.5} />
              <span className={`text-[10px] tracking-wide ${active ? 'text-[#1A1A2E] dark:text-[#D4A843] font-semibold' : 'text-gray-400 dark:text-[#5a6a6e]'}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
