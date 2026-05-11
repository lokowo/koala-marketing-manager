'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, BookOpen, UserCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

const NAV_ITEMS: { href: string; icon: React.ElementType; label: string; highlight?: boolean }[] = [
  { href: '/koala/discover', icon: Home, label: '发现' },
  { href: '/koala/professors', icon: Users, label: '教授库' },
  { href: '/koala/chat', icon: MessageCircle, label: 'Koala AI', highlight: true },
  { href: '/koala/blog', icon: BookOpen, label: '博客' },
  { href: '/koala/my-profile', icon: UserCircle, label: '我的' },
];

export default function TopNavBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="hidden lg:flex fixed top-0 inset-x-0 z-50 items-center justify-between px-8"
      style={{
        backgroundColor: '#0a0e14',
        borderBottom: '1px solid rgba(201,169,110,0.12)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        height: 64,
      }}
    >
      {/* Logo — always goes to homepage */}
      <Link href="/koala/home" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
        <span className="text-2xl">🐨</span>
        <span className="font-bold text-base" style={{ color: '#c9a96e' }}>Koala PhD</span>
      </Link>

      {/* Nav links */}
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold mx-2"
                style={{ background: '#c9a96e', color: '#080c10', textDecoration: 'none' }}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors relative"
              style={{
                color: active ? '#c9a96e' : '#6a7a7e',
                fontWeight: active ? 700 : 400,
                background: active ? 'rgba(201,169,110,0.1)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              <Icon className="size-4" />
              {item.label}
              {showDot && (
                <span
                  className="absolute top-1.5 right-1.5 size-2 rounded-full"
                  style={{ background: '#5a8060' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
