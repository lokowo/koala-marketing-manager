'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Users, BookOpen, Heart } from 'lucide-react';
import { APP_VERSION } from '../../lib/version';
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

  function isActive(href: string) {
    if (href === '/koala/discover') return pathname === '/koala/discover' || pathname === '/koala/home' || pathname === '/koala';
    return pathname.startsWith(href);
  }

  const koalaHref = (pathname === '/koala/home' || pathname === '/koala') ? '/koala/chat' : '/koala/home';
  const koalaActive = pathname.startsWith('/koala/chat') || pathname === '/koala/home' || pathname === '/koala';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50" style={{ backgroundColor: '#0a0e14', borderTop: '1px solid rgba(201,169,110,0.12)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="text-center" style={{ fontSize: 9, color: 'rgba(201,169,110,0.3)', paddingTop: 2 }}>{APP_VERSION}</div>
      <div className="relative flex justify-around items-end px-4 pb-6 pt-2" style={{ maxWidth: 480, margin: '0 auto' }}>
        {LEFT_TABS.map(tab => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center flex-1 gap-1" style={{ textDecoration: 'none' }}>
              <Icon className="size-5" style={{ color: active ? '#c9a96e' : '#5a6a6e' }} strokeWidth={active ? 2.2 : 1.5} />
              <span className="text-[10px]" style={{ color: active ? '#c9a96e' : '#5a6a6e', fontWeight: active ? 600 : 400, letterSpacing: '0.5px' }}>{tab.label}</span>
            </Link>
          );
        })}
        <div className="flex justify-center flex-1">
          <Link href={koalaHref} className="size-14 rounded-full flex absolute -top-5 flex-col justify-center items-center" style={{ background: koalaActive ? 'linear-gradient(135deg, #c9a96e, #a68540)' : 'linear-gradient(135deg, #1a3a2a, #0d2818)', border: '2px solid rgba(201,169,110,0.3)', boxShadow: koalaActive ? '0 6px 20px rgba(201,169,110,0.4)' : '0 4px 12px rgba(0,0,0,0.3)', textDecoration: 'none' }}>
            <span className="text-xl leading-none">🐨</span>
            <span className="font-semibold text-[9px]" style={{ color: koalaActive ? '#0a0e14' : '#c9a96e' }}>Koala</span>
          </Link>
        </div>
        {RIGHT_TABS.map(tab => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center flex-1 gap-1" style={{ textDecoration: 'none' }}>
              <Icon className="size-5" style={{ color: active ? '#c9a96e' : '#5a6a6e' }} strokeWidth={active ? 2.2 : 1.5} />
              <span className="text-[10px]" style={{ color: active ? '#c9a96e' : '#5a6a6e', fontWeight: active ? 600 : 400, letterSpacing: '0.5px' }}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
