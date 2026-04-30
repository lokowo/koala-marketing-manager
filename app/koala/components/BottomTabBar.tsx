'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, BookOpen, Wrench } from 'lucide-react';

const SIDE_TABS = [
  { href: '/koala/home', icon: Home, label: '首页' },
  { href: '/koala/professors', icon: Users, label: '教授' },
  { href: '/koala/blog', icon: BookOpen, label: '博客' },
  { href: '/koala/tools', icon: Wrench, label: '工具' },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();
  const isChat = pathname.startsWith('/koala/chat');

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
        {SIDE_TABS.slice(0, 2).map(tab => {
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
        {SIDE_TABS.slice(2).map(tab => {
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
      </div>
    </div>
  );
}
