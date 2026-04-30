'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { supabase } from '../../lib/supabase/client';
import type { UserRole } from '../../lib/auth';

interface NavSection {
  icon: string;
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

export default function KoalaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace(`/login?from=${pathname}`);
        return;
      }
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const { role } = await res.json();
        setRole(role);
      }
      setAuthChecked(true);
    });
  }, [router, pathname]);

  useEffect(() => {
    const sections: NavSection[] = buildNav(role);
    for (const s of sections) {
      if (s.children?.some(c => pathname.startsWith(c.href))) {
        setExpanded(s.href);
        break;
      }
      if (pathname === s.href || pathname.startsWith(s.href + '/')) {
        setExpanded(s.href);
        break;
      }
    }
  }, [pathname, role]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function buildNav(userRole: UserRole | null): NavSection[] {
    const nav: NavSection[] = [
      {
        icon: '📊',
        label: '仪表盘',
        href: '/dashboard/koala',
      },
      {
        icon: '📝',
        label: '博客管理',
        href: '/dashboard/koala/blog',
        children: [
          { label: '草稿箱', href: '/dashboard/koala/blog/drafts' },
          { label: '已发布', href: '/dashboard/koala/blog/published' },
          { label: '定时发布', href: '/dashboard/koala/blog/scheduled' },
          { label: '全部', href: '/dashboard/koala/blog' },
        ],
      },
      {
        icon: '✨',
        label: 'AI 内容生成',
        href: '/dashboard/koala/ai-content',
        children: [
          { label: '单篇生成', href: '/dashboard/koala/ai-content' },
          { label: '批量生成', href: '/dashboard/koala/ai-content/batch' },
          { label: '知识库内容', href: '/dashboard/koala/ai-content/knowledge' },
        ],
      },
      {
        icon: '👨‍🏫',
        label: '教授库管理',
        href: '/dashboard/koala/professors',
        children: [
          { label: '审核列表', href: '/dashboard/koala/professors' },
          { label: '已发布', href: '/dashboard/koala/professors/verified' },
          { label: '数据采集', href: '/dashboard/koala/professors/sync' },
        ],
      },
      {
        icon: '👥',
        label: '用户管理',
        href: '/dashboard/koala/users',
      },
      {
        icon: '⚙️',
        label: '系统设置',
        href: '/dashboard/koala/settings',
      },
    ];

    if (userRole !== 'super_admin') {
      return nav.filter(n => n.href !== '/dashboard/koala/users');
    }
    return nav;
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <p className="text-slate-400 text-sm">验证身份中…</p>
      </div>
    );
  }

  const navSections = buildNav(role);

  function isActive(href: string) {
    if (href === '/dashboard/koala') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold">Koala PhD Admin</h1>
          <p className="text-xs text-slate-400 mt-1">后台管理系统</p>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navSections.map((section) => {
              const active = isActive(section.href);
              const isExpanded = expanded === section.href;

              return (
                <li key={section.href}>
                  {section.children ? (
                    <>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : section.href)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          active
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{section.icon}</span>
                        <span className="flex-1 text-left">{section.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <ul className="mt-1 ml-8 space-y-0.5">
                          {section.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                                  pathname === child.href
                                    ? 'text-amber-400 bg-slate-800/50'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={section.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{section.icon}</span>
                      <span>{section.label}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <LanguageSwitcher />
          <button
            onClick={handleSignOut}
            className="block w-full text-left text-sm text-slate-400 hover:text-white transition"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
