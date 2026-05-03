'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, BookOpen, UserCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

const LEFT_TABS = [
  { href: '/koala/home', icon: Home, label: '首页' },
  { href: '/koala/professors', icon: Users, label: '教授' },
] as const;

const RIGHT_TABS = [
  { href: '/koala/blog', icon: BookOpen, label: '博客' },
  { href: '/koala/my-profile', icon: UserCircle, label: '我的' },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50"
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #f0e8d4',
        boxShadow: '0 -4px 16px rgba(196,160,80,0.08)',
      }}
    >
      <div
        className="relative flex justify-around items-end px-4 pb-6 pt-2"
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        {/* Left 2 tabs */}
        {LEFT_TABS.map(tab => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center flex-1 gap-1"
              style={{ textDecoration: 'none' }}
            >
              <Icon className="size-5" style={{ color: active ? '#c4a050' : '#a89878' }} />
              <span
                className="text-[11px]"
                style={{
                  color: active ? '#c4a050' : '#a89878',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Center Koala raised button */}
        <div className="flex justify-center flex-1">
          <Link
            href="/koala/chat"
            className="size-14 rounded-full flex absolute -top-5 flex-col justify-center items-center"
            style={{
              backgroundColor: '#c4a050',
              boxShadow: '0 6px 16px rgba(196,160,80,0.45)',
              textDecoration: 'none',
            }}
          >
            <MessageCircle className="size-6 text-white" />
            <span className="font-semibold text-white text-[10px]">Koala</span>
          </Link>
        </div>

        {/* Right 2 tabs */}
        {RIGHT_TABS.map(tab => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          // For "我的", show a dot if user is logged in
          const showDot = tab.href === '/koala/my-profile' && user && !active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center flex-1 gap-1 relative"
              style={{ textDecoration: 'none' }}
            >
              <div className="relative">
                <Icon className="size-5" style={{ color: active ? '#c4a050' : '#a89878' }} />
                {showDot && (
                  <span
                    className="absolute -top-0.5 -right-0.5 size-2 rounded-full"
                    style={{ background: '#5a8060' }}
                  />
                )}
              </div>
              <span
                className="text-[11px]"
                style={{
                  color: active ? '#c4a050' : '#a89878',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
