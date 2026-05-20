'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import { supabase } from '../../lib/supabase/client';
import type { UserRole } from '../../lib/auth';

interface NavGroup {
  key: string;
  label: string;
  color: string;
  items: { icon: string; label: string; href: string }[];
  superAdminOnly?: boolean;
}

function buildNavGroups(role: UserRole | null): { standalone: { icon: string; label: string; href: string }[]; groups: NavGroup[] } {
  const standalone = [
    { icon: '📊', label: '仪表盘', href: '/dashboard/koala' },
  ];

  const groups: NavGroup[] = [];

  if (role === 'super_admin') {
    groups.push({
      key: 'distribution',
      label: '分销管理',
      color: '#F59E0B',
      superAdminOnly: true,
      items: [
        { icon: '📊', label: '分销总览', href: '/dashboard/koala/sales-overview' },
        { icon: '👤', label: '销售人员', href: '/dashboard/koala/sales-agents' },
        { icon: '💲', label: '佣金比例', href: '/dashboard/koala/commission-rates' },
        { icon: '🎯', label: 'KPI 目标', href: '/dashboard/koala/kpi-targets' },
        { icon: '✅', label: '佣金审核', href: '/dashboard/koala/commission-review' },
        { icon: '📋', label: '审计日志', href: '/dashboard/koala/sales-audit' },
      ],
    });
  }

  groups.push({
    key: 'users',
    label: '用户与增长',
    color: '#3B82F6',
    items: [
      { icon: '👥', label: '用户管理', href: '/dashboard/koala/users' },
      ...(role === 'super_admin' ? [{ icon: '🏷', label: '角色管理', href: '/dashboard/koala/roles' }] : []),
      { icon: '📈', label: '用户增长', href: '/dashboard/koala/growth' },
      { icon: '📊', label: '数据分析', href: '/dashboard/koala/analytics' },
      { icon: '💰', label: '收入分析', href: '/dashboard/koala/revenue' },
      ...(role === 'super_admin' ? [{ icon: '🔔', label: '站内信', href: '/dashboard/koala/notifications' }] : []),
    ],
  });

  groups.push({
    key: 'content',
    label: '内容管理',
    color: '#22C55E',
    items: [
      { icon: '📰', label: '博客管理', href: '/dashboard/koala/blog' },
      { icon: '💡', label: '话题管理', href: '/dashboard/koala/topics' },
      { icon: '🤖', label: 'AI 内容', href: '/dashboard/koala/ai-content' },
      { icon: '🖼', label: 'Banner', href: '/dashboard/koala/banners' },
      { icon: '📋', label: '问卷管理', href: '/dashboard/koala/surveys' },
    ],
  });

  groups.push({
    key: 'professors',
    label: '教授库',
    color: '#8B5CF6',
    items: [
      { icon: '🎓', label: '教授管理', href: '/dashboard/koala/professors' },
      { icon: '💰', label: 'Grants', href: '/dashboard/koala/grants' },
      { icon: '📚', label: '知识库', href: '/dashboard/koala/knowledge-base' },
      { icon: '❓', label: 'FAQ', href: '/dashboard/koala/faq' },
    ],
  });

  groups.push({
    key: 'ola',
    label: 'Ola 智能助手',
    color: '#EC4899',
    items: [
      { icon: '⚡', label: '触发器', href: '/dashboard/koala/ola-triggers' },
      { icon: '📈', label: 'Ola 分析', href: '/dashboard/koala/ola-analytics' },
      { icon: '🤝', label: 'Handoff 队列', href: '/dashboard/koala/handoff' },
    ],
  });

  groups.push({
    key: 'system',
    label: '系统',
    color: '#64748B',
    items: [
      { icon: '⚙️', label: '系统设置', href: '/dashboard/koala/settings' },
      { icon: '📝', label: '工作日志', href: '/dashboard/koala/work-logs' },
      { icon: '🔧', label: '营销工具', href: '/dashboard/koala/marketing-tools' },
    ],
  });

  return { standalone, groups };
}

function SidebarGroup({
  group,
  pathname,
  collapsed,
  mobile,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const storageKey = `sidebar_group_${group.key}`;
  const hasActiveItem = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return hasActiveItem;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return stored === '1';
    return hasActiveItem;
  });

  useEffect(() => {
    if (hasActiveItem && !open) setOpen(true);
  }, [hasActiveItem]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(storageKey, open ? '1' : '0');
  }, [open, storageKey]);

  const showLabel = mobile || !collapsed;

  if (!showLabel) {
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center py-2 rounded-lg text-sm transition-colors no-underline ${
                active
                  ? 'bg-[#FEF3C7] text-[#92400E]'
                  : 'text-[#374151] hover:bg-[#F3F4F6]'
              }`}
              title={item.label}
            >
              <span className="flex-shrink-0">{item.icon}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer group"
      >
        <div
          className="w-1 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <span className="flex-1 text-left text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">
          {group.label}
        </span>
        <svg
          className={`w-3 h-3 text-[#9CA3AF] transition-transform duration-200 ${
            open ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {open && (
        <ul className="space-y-0.5 mt-0.5">
          {group.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 pl-6 pr-3 py-1.5 rounded-lg text-[13px] transition-colors no-underline ${
                    active
                      ? 'bg-[#FEF3C7] text-[#92400E] font-medium'
                      : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
                  }`}
                >
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function KoalaLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace(`/login?from=${pathname}`);
        return;
      }
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const { role } = await res.json();
        if (role === 'sales') {
          router.replace('/dashboard/sales');
          return;
        }
        setRole(role);
      }
      setAuthChecked(true);
    });
  }, [router, pathname]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [router]);

  if (!authChecked) {
    return (
      <div className="flex h-screen bg-[#F9FAFB] items-center justify-center">
        <p className="text-slate-400 text-sm">验证身份中...</p>
      </div>
    );
  }

  const { standalone, groups } = buildNavGroups(role);

  function isStandaloneActive(href: string) {
    if (href === '/dashboard/koala') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  const closeMobile = () => setSidebarOpen(false);

  const sidebarContent = (mobile?: boolean) => {
    const showLabel = mobile || !collapsed;
    return (
      <>
        {/* Logo / Title */}
        <div
          className={`${
            collapsed && !mobile ? 'px-3 py-4' : 'px-5 py-5'
          } border-b border-[#E5E7EB] flex items-center gap-3`}
        >
          {showLabel && (
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold tracking-tight text-[#111827]">
                Koala PhD
              </h1>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                Admin Console
              </p>
            </div>
          )}
          {mobile ? (
            <button
              onClick={closeMobile}
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#374151] transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#374151] transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {collapsed ? (
                  <path d="M9 18l6-6-6-6" />
                ) : (
                  <path d="M15 18l-6-6 6-6" />
                )}
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {/* Standalone items (Dashboard) */}
          <div className="space-y-0.5 mb-2">
            {standalone.map((item) => {
              const active = isStandaloneActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={mobile ? closeMobile : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors no-underline ${
                    active
                      ? 'bg-[#FEF3C7] text-[#92400E] font-medium'
                      : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
                  }`}
                  title={!showLabel ? item.label : undefined}
                >
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                  {showLabel && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Collapsible groups */}
          <div className="space-y-1">
            {groups.map((group) => (
              <SidebarGroup
                key={group.key}
                group={group}
                pathname={pathname}
                collapsed={collapsed}
                mobile={mobile}
                onNavigate={mobile ? closeMobile : undefined}
              />
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div
          className={`${
            collapsed && !mobile ? 'px-2' : 'px-4'
          } py-3 border-t border-[#E5E7EB]`}
        >
          {showLabel && (
            <div className="text-[11px] text-[#9CA3AF] mb-2">
              {role === 'super_admin'
                ? '超级管理员'
                : role === 'admin'
                ? '管理员'
                : role === 'sales'
                ? '销售'
                : '只读'}
            </div>
          )}
          <Link
            href="/koala/home"
            target="_blank"
            className="flex items-center gap-2 w-full text-left text-[13px] text-[#6B7280] hover:text-[#111827] transition px-2 py-1.5 rounded hover:bg-[#F3F4F6] no-underline mb-0.5"
            title="前往前端"
          >
            {collapsed && !mobile ? '🔗' : '🔗 前往前端'}
          </Link>
          <Link
            href="/koala/home"
            className="flex items-center gap-2 w-full text-left text-[13px] text-[#6B7280] hover:text-[#111827] transition px-2 py-1.5 rounded hover:bg-[#F3F4F6] no-underline mb-0.5"
            title="返回主页"
          >
            {collapsed && !mobile ? '🏠' : '🏠 返回主页'}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full text-left text-[13px] text-[#6B7280] hover:text-[#111827] transition px-2 py-1.5 rounded hover:bg-[#F3F4F6]"
            title="退出登录"
          >
            {collapsed && !mobile ? '🚪' : '🚪 退出登录'}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeMobile}
          />
          <div className="absolute top-0 left-0 w-[280px] h-full bg-white flex flex-col z-10 shadow-lg">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-white border-r border-[#E5E7EB] hidden md:flex flex-col shrink-0 transition-all duration-200`}
      >
        {sidebarContent()}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
