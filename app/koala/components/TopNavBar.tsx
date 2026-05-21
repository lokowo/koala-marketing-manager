'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, CreditCard, BookOpen, UserCircle, Bell } from 'lucide-react';
import { useAuth } from './AuthContext';
import { OlaAvatar } from './ola/OlaAvatar';

const NAV_ITEMS: { href: string; icon: React.ElementType; label: string; highlight?: boolean; badge?: boolean }[] = [
  { href: '/koala/home', icon: Home, label: '首页' },
  { href: '/koala/chat', icon: MessageCircle, label: 'Ola AI', highlight: true },
  { href: '/koala/professors', icon: Users, label: '教授库' },
  { href: '/koala/pricing', icon: CreditCard, label: '定价' },
  { href: '/koala/blog', icon: BookOpen, label: '博客' },
  { href: '/koala/messages', icon: Bell, label: '消息', badge: true },
  { href: '/koala/my-profile', icon: UserCircle, label: '我的' },
];

export default function TopNavBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    fetch('/api/user/notifications?limit=1')
      .then(r => r.json())
      .then(d => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {});
  }, [user]);

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <nav className="hidden lg:flex fixed top-0 inset-x-0 z-50 items-center justify-between px-8 h-16 bg-white dark:bg-[#0a0e14] border-b border-gray-200 dark:border-[rgba(201,169,110,0.12)] shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
      <Link href="/koala/home" className="flex items-center gap-2 no-underline">
        <OlaAvatar state="welcome" size="sm" className="rounded-full" />
        <span className="font-bold text-base text-[#1A1A2E] dark:text-[#D4A843]">Koala PhD</span>
      </Link>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const showDot = item.href === '/koala/my-profile' && user && !active;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold mx-2 no-underline bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]"
              >
                <OlaAvatar state="welcome" size="sm" className="size-5 rounded-full" />
                {item.label}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors relative no-underline ${
                active
                  ? 'text-[#1A1A2E] dark:text-[#D4A843] font-bold bg-gray-100 dark:bg-[#D4A843]/10'
                  : 'text-gray-500 dark:text-[#6a7a7e] hover:text-gray-700 dark:hover:text-[#9CA3AF]'
              }`}
            >
              <Icon className="size-4" />
              {item.label}
              {showDot && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-green-600" />
              )}
              {item.badge && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold bg-[#b06040] text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
