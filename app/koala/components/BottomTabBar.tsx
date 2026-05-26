'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, UserCircle, CreditCard, Mail, ClipboardList, FileText, Bell, Settings } from 'lucide-react';
import { APP_VERSION } from '../../lib/version';
import { useTheme } from '../../lib/theme';
import { useAuth } from './AuthContext';
import { OlaAvatar } from './ola/OlaAvatar';

const MY_MENU_ITEMS = [
  { href: '/koala/pricing', icon: CreditCard, label: '定价' },
  { href: '/koala/my-emails', icon: Mail, label: '套磁信' },
  { href: '/koala/my-applications', icon: ClipboardList, label: '申请' },
  { href: '/koala/my-documents', icon: FileText, label: '文档' },
  { href: '/koala/messages', icon: Bell, label: '消息' },
  { href: '/koala/my-profile', icon: Settings, label: '设置' },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const { resolved: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { user, showLogin } = useAuth();
  const [myOpen, setMyOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!myOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMyOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [myOpen]);

  function isActive(href: string) {
    if (href === '/koala/home') return pathname === '/koala/home' || pathname === '/koala';
    return pathname.startsWith(href);
  }

  const olaActive = pathname.startsWith('/koala/chat');

  return (
    <>
      {/* Backdrop when menu is open */}
      {myOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={() => setMyOpen(false)} />
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#0a0e14] border-t border-gray-200 dark:border-[rgba(201,169,110,0.12)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {process.env.NODE_ENV !== 'production' && (
          <div className="text-center text-[9px] text-gray-300 dark:text-[#D4A843]/30 pt-0.5">{APP_VERSION}</div>
        )}

        {/* My menu panel — slides up from bottom tab */}
        {myOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-full left-0 right-0 mx-4 mb-2 rounded-xl border border-gray-200 dark:border-[rgba(201,169,110,0.15)] bg-white dark:bg-[#0d1520] shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[480px] sm:mx-auto"
          >
            {MY_MENU_ITEMS.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMyOpen(false)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg no-underline transition-colors ${
                    active
                      ? 'bg-gray-100 dark:bg-[#D4A843]/10 text-[#1A1A2E] dark:text-[#D4A843]'
                      : 'text-gray-600 dark:text-[#8a9a9e] hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="relative flex justify-around items-end px-4 pb-6 pt-2 max-w-[480px] mx-auto">
          {/* 首页 */}
          <Link href="/koala/home" className="flex flex-col items-center flex-1 gap-1 no-underline">
            <Home className={`size-5 ${isActive('/koala/home') ? 'text-[#1A1A2E] dark:text-[#D4A843]' : 'text-gray-400 dark:text-[#5a6a6e]'}`} strokeWidth={isActive('/koala/home') ? 2.2 : 1.5} />
            <span className={`text-[10px] tracking-wide ${isActive('/koala/home') ? 'text-[#1A1A2E] dark:text-[#D4A843] font-semibold' : 'text-gray-400 dark:text-[#5a6a6e]'}`}>首页</span>
          </Link>

          {/* Ola AI — center raised button */}
          <Link
            href="/koala/chat"
            className={`size-14 rounded-full flex absolute -top-5 left-1/2 -translate-x-1/2 flex-col justify-center items-center no-underline border-2 shadow-lg ${
              olaActive
                ? 'border-[#1A1A2E]/20 dark:border-[#D4A843]/30 shadow-[0_6px_20px_rgba(26,26,46,0.3)] dark:shadow-[0_6px_20px_rgba(212,168,67,0.4)]'
                : 'border-gray-200 dark:border-[#D4A843]/30 shadow-[0_4px_12px_rgba(26,26,46,0.2)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
            }`}
            style={{
              background: isDark
                ? olaActive
                  ? 'linear-gradient(135deg, #D4A843, #a68540)'
                  : 'linear-gradient(135deg, #1a3a2a, #0d2818)'
                : '#1A1A2E',
            }}
          >
            <OlaAvatar assetId="h-09-bubbly-boba-nobg" size="sm" className="size-7 rounded-full" />
            <span className={`font-semibold text-[9px] ${olaActive ? 'text-white dark:text-[#0a0e14]' : 'text-white dark:text-[#D4A843]'}`}>Ola</span>
          </Link>

          {/* Center spacer for Ola button */}
          <div className="flex-1" />

          {/* 教授库 */}
          <Link href="/koala/professors" className="flex flex-col items-center flex-1 gap-1 no-underline">
            <Users className={`size-5 ${isActive('/koala/professors') ? 'text-[#1A1A2E] dark:text-[#D4A843]' : 'text-gray-400 dark:text-[#5a6a6e]'}`} strokeWidth={isActive('/koala/professors') ? 2.2 : 1.5} />
            <span className={`text-[10px] tracking-wide ${isActive('/koala/professors') ? 'text-[#1A1A2E] dark:text-[#D4A843] font-semibold' : 'text-gray-400 dark:text-[#5a6a6e]'}`}>教授库</span>
          </Link>

          {/* 我的 — opens panel */}
          <button
            onClick={() => {
              if (!user) { showLogin(); return; }
              setMyOpen(prev => !prev);
            }}
            className="flex flex-col items-center flex-1 gap-1 bg-transparent border-0 cursor-pointer"
          >
            <UserCircle className={`size-5 ${myOpen || isActive('/koala/my-') ? 'text-[#1A1A2E] dark:text-[#D4A843]' : 'text-gray-400 dark:text-[#5a6a6e]'}`} strokeWidth={myOpen || isActive('/koala/my-') ? 2.2 : 1.5} />
            <span className={`text-[10px] tracking-wide ${myOpen || isActive('/koala/my-') ? 'text-[#1A1A2E] dark:text-[#D4A843] font-semibold' : 'text-gray-400 dark:text-[#5a6a6e]'}`}>我的</span>
          </button>
        </div>
      </div>
    </>
  );
}
