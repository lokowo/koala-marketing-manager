'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import { supabase } from '../../lib/supabase/client';
import type { UserRole } from '../../lib/auth';

interface NavItem {
  icon: string;
  label: string;
  href: string;
  children?: { label: string; href: string }[];
  adminOnly?: boolean;
}

export default function KoalaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const sections = buildNav(role);
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

  function buildNav(userRole: UserRole | null): NavItem[] {
    const nav: NavItem[] = [
      { icon: '📊', label: '仪表盘', href: '/dashboard/koala' },
      {
        icon: '👨\u200D🏫', label: '教授库',
        href: '/dashboard/koala/professors',
        children: [
          { label: '全部教授', href: '/dashboard/koala/professors' },
          { label: '数据质量', href: '/dashboard/koala/professors/quality' },
        ],
      },
      { icon: '📝', label: '博客管理', href: '/dashboard/koala/blog' },
      {
        icon: '📋', label: '问卷调研',
        href: '/dashboard/koala/surveys',
        children: [
          { label: '问卷列表', href: '/dashboard/koala/surveys' },
          { label: '新建问卷', href: '/dashboard/koala/surveys/create' },
        ],
      },
      { icon: '👥', label: '用户管理', href: '/dashboard/koala/users', adminOnly: true },
      { icon: '📈', label: '数据分析', href: '/dashboard/koala/analytics' },
      { icon: '🌱', label: '用户增长', href: '/dashboard/koala/growth' },
      { icon: '⚙️', label: '系统设置', href: '/dashboard/koala/settings' },
    ];

    if (userRole === 'super_admin') {
      nav.splice(1, 0,
        { icon: '📊', label: '管理总览', href: '/dashboard/koala/admin-overview', adminOnly: true },
        { icon: '📋', label: '角色管理', href: '/dashboard/koala/roles', adminOnly: true },
        { icon: '📝', label: '工作日志', href: '/dashboard/koala/work-logs', adminOnly: true },
        { icon: '📈', label: 'Sales 管理', href: '/dashboard/koala/sales-overview', adminOnly: true },
        { icon: '🎯', label: 'Sales KPI', href: '/dashboard/koala/kpi-settings', adminOnly: true },
        { icon: '🔔', label: '站内信', href: '/dashboard/koala/notifications', adminOnly: true },
      );
    }

    if (userRole === 'admin' || userRole === 'sales') {
      const filtered = nav.filter(n => !n.adminOnly);
      filtered.push({ icon: '📝', label: '我的操作记录', href: '/dashboard/koala/my-logs' });
      return filtered;
    }
    if (userRole !== 'super_admin') {
      return nav.filter(n => !n.adminOnly);
    }
    return nav;
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <p className="text-slate-400 text-sm">验证身份中...</p>
      </div>
    );
  }

  const navSections = buildNav(role);

  function isActive(href: string) {
    if (href === '/dashboard/koala') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  const sidebarContent = (mobile?: boolean) => (
    <>
      <div className={`${collapsed && !mobile ? 'px-3 py-4' : 'px-5 py-5'} border-b border-slate-800 flex items-center gap-3`}>
        {(!collapsed || mobile) && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold tracking-tight">Koala PhD</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Admin Console</p>
          </div>
        )}
        {mobile ? (
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        ) : (
          <button onClick={() => setCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {navSections.map((section) => {
            const active = isActive(section.href);
            const isExp = expanded === section.href;
            const showLabel = mobile || !collapsed;

            return (
              <li key={section.href}>
                {section.children ? (
                  <>
                    <button
                      onClick={() => setExpanded(isExp ? null : section.href)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                        active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                      title={!showLabel ? section.label : undefined}
                    >
                      <span className="text-sm flex-shrink-0">{section.icon}</span>
                      {showLabel && (
                        <>
                          <span className="flex-1 text-left">{section.label}</span>
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExp ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                    {isExp && showLabel && (
                      <ul className="mt-0.5 ml-7 space-y-0.5">
                        {section.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => mobile && setSidebarOpen(false)}
                              className={`block px-3 py-1.5 rounded text-[13px] transition-colors no-underline ${
                                pathname === child.href ? 'text-amber-400 bg-slate-800/40' : 'text-slate-500 hover:text-slate-300'
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
                    onClick={() => mobile && setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors no-underline ${
                      active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                    title={!showLabel ? section.label : undefined}
                  >
                    <span className="text-sm flex-shrink-0">{section.icon}</span>
                    {showLabel && <span>{section.label}</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`${collapsed && !mobile ? 'px-2' : 'px-4'} py-3 border-t border-slate-800`}>
        {(!collapsed || mobile) && (
          <div className="text-[11px] text-slate-600 mb-2">
            {role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : role === 'sales' ? '销售' : '只读'}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full text-left text-[13px] text-slate-500 hover:text-white transition px-2 py-1.5 rounded hover:bg-slate-800/60"
          title="退出登录"
        >
          {collapsed && !mobile ? '🚪' : '退出登录'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-slate-950">
      {/* Mobile hamburger overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 left-0 w-[280px] h-full bg-[#0a1018] text-white flex flex-col z-10">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={`${collapsed ? 'w-16' : 'w-60'} bg-[#0f172a] text-white hidden md:flex flex-col shrink-0 transition-all duration-200`}>
        {sidebarContent()}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
