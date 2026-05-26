'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, BookOpen, UserCircle, CreditCard, Mail, ClipboardList, FileText, Bell, Settings } from 'lucide-react';
import { useAuth } from './AuthContext';
import { OlaAvatar } from './ola/OlaAvatar';

const MAIN_NAV = [
  { href: '/koala/chat', label: 'Ola AI', highlight: true },
  { href: '/koala/professors', icon: Users, label: '教授库' },
  { href: '/koala/blog', icon: BookOpen, label: '博客' },
];

const MY_MENU_ITEMS = [
  { href: '/koala/pricing', icon: CreditCard, label: '定价' },
  { href: '/koala/my-emails', icon: Mail, label: '套磁信' },
  { href: '/koala/my-applications', icon: ClipboardList, label: '申请' },
  { href: '/koala/my-documents', icon: FileText, label: '文档' },
  { href: '/koala/messages', icon: Bell, label: '消息' },
  { href: '/koala/my-profile', icon: Settings, label: '设置' },
];

export default function TopNavBar() {
  const pathname = usePathname();
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
    return pathname.startsWith(href);
  }

  return (
    <nav className="hidden lg:flex fixed top-0 inset-x-0 z-50 items-center justify-between px-8 h-16 bg-white dark:bg-[#0a0e14] border-b border-gray-200 dark:border-[rgba(201,169,110,0.12)] shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
      <Link href="/koala/home" className="flex items-center gap-2 no-underline">
        <Image src="/koala-logo.svg" alt="Koala PhD" width={28} height={28} className="rounded-full" />
        <span className="font-bold text-base text-[#1A1A2E] dark:text-[#D4A843]">Koala PhD</span>
      </Link>

      <div className="flex items-center gap-1">
        {MAIN_NAV.map(item => {
          const active = isActive(item.href);

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

          const Icon = item.icon!;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors no-underline ${
                active
                  ? 'text-[#1A1A2E] dark:text-[#D4A843] font-bold bg-gray-100 dark:bg-[#D4A843]/10'
                  : 'text-gray-500 dark:text-[#6a7a7e] hover:text-gray-700 dark:hover:text-[#9CA3AF]'
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}

        {/* 我的 — dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              if (!user) { showLogin(); return; }
              setMyOpen(prev => !prev);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors ${
              myOpen || isActive('/koala/my-')
                ? 'text-[#1A1A2E] dark:text-[#D4A843] font-bold bg-gray-100 dark:bg-[#D4A843]/10'
                : 'text-gray-500 dark:text-[#6a7a7e] hover:text-gray-700 dark:hover:text-[#9CA3AF]'
            }`}
          >
            <UserCircle className="size-4" />
            我的
          </button>

          {myOpen && (
            <div className="absolute right-0 top-full mt-2 w-[280px] rounded-xl border border-gray-200 dark:border-[rgba(201,169,110,0.15)] bg-white dark:bg-[#0d1520] shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
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
        </div>
      </div>
    </nav>
  );
}
