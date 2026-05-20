'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';
import {
  IconLayoutDashboard,
  IconSpeakerphone,
  IconFileDescription,
  IconUsers,
  IconChartBar,
  IconCoins,
  IconHistory,
  IconSettings,
  IconHome,
  IconLogout,
  IconShieldStar,
  IconMenu2,
  IconX,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

interface NavItem {
  icon: TablerIcon;
  label: string;
  href: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: IconLayoutDashboard, label: '仪表盘', href: '/dashboard/sales' },
  { icon: IconSpeakerphone, label: '推广中心', href: '/dashboard/sales/promo-center', group: '推广' },
  { icon: IconFileDescription, label: '问卷管理', href: '/dashboard/sales/surveys' },
  { icon: IconUsers, label: '我的客户', href: '/dashboard/sales/referral-users', group: '客户' },
  { icon: IconChartBar, label: '渠道分析', href: '/dashboard/sales/channel-analytics' },
  { icon: IconCoins, label: '佣金明细', href: '/dashboard/sales/my-commissions', group: '收入' },
  { icon: IconHistory, label: '操作记录', href: '/dashboard/sales/my-logs', group: '个人' },
  { icon: IconSettings, label: '个人设置', href: '/dashboard/sales/settings' },
];

export default function SalesLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      setDark(saved === 'dark');
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace(`/login?from=${pathname}`);
        return;
      }
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const { role: r } = await res.json();
        if (r !== 'sales' && r !== 'admin' && r !== 'super_admin') {
          router.replace('/login');
          return;
        }
        setRole(r);
      }
      setAuthChecked(true);
    });
  }, [router, pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen bg-[#F9FAFB] dark:bg-[#0F172A] items-center justify-center">
        <p className="text-slate-400 text-sm">验证身份中...</p>
      </div>
    );
  }

  function isActive(href: string) {
    if (href === '/dashboard/sales') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  const isAdmin = role === 'admin' || role === 'super_admin';

  const sidebarContent = (mobile?: boolean) => (
    <>
      <div className={`${collapsed && !mobile ? 'px-3 py-4' : 'px-5 py-5'} border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-3`}>
        {(!collapsed || mobile) && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold tracking-tight text-[#111827] dark:text-[#F1F5F9]">Sales Center</h1>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">销售工作台</p>
          </div>
        )}
        {mobile ? (
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E2E8F0] transition-colors flex-shrink-0">
            <IconX size={16} strokeWidth={2} />
          </button>
        ) : (
          <button onClick={() => setCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E2E8F0] transition-colors flex-shrink-0">
            {collapsed ? <IconChevronRight size={16} strokeWidth={2} /> : <IconChevronLeft size={16} strokeWidth={2} />}
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const showLabel = mobile || !collapsed;
            const Icon = item.icon;
            return (
              <div key={item.href}>
                {item.group && showLabel && (
                  <div className="px-3 pt-5 pb-1.5">
                    <span className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#94A3B8]">{item.group}</span>
                  </div>
                )}
                <Link
                  href={item.href}
                  onClick={() => mobile && setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors no-underline ${
                    active
                      ? 'font-medium text-[#F59E0B] bg-[#FFFBEB] dark:bg-[#F59E0B]/10'
                      : 'text-[#64748B] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#1E293B] dark:hover:text-[#E2E8F0]'
                  }`}
                  title={!showLabel ? item.label : undefined}
                >
                  <Icon size={18} strokeWidth={1.5} className={`flex-shrink-0 ${active ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`} />
                  {showLabel && <span>{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      <div className={`${collapsed && !mobile ? 'px-2' : 'px-3'} py-3 border-t border-[#E2E8F0] dark:border-[#334155] space-y-0.5`}>
        {isAdmin && (
          <Link
            href="/dashboard/koala"
            onClick={() => mobile && setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-[#64748B] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#1E293B] dark:hover:text-[#E2E8F0] transition-colors no-underline"
            title="管理后台"
          >
            <IconShieldStar size={18} strokeWidth={1.5} className="text-[#94A3B8] flex-shrink-0" />
            {(!collapsed || mobile) && <span>管理后台</span>}
          </Link>
        )}
        <Link
          href="/koala/home"
          onClick={() => mobile && setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-[#64748B] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#1E293B] dark:hover:text-[#E2E8F0] transition-colors no-underline"
          title="返回主页"
        >
          <IconHome size={18} strokeWidth={1.5} className="text-[#94A3B8] flex-shrink-0" />
          {(!collapsed || mobile) && <span>返回主页</span>}
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-[13px] text-[#64748B] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] hover:text-[#1E293B] dark:hover:text-[#E2E8F0] transition-colors"
          title="退出登录"
        >
          <IconLogout size={18} strokeWidth={1.5} className="text-[#94A3B8] flex-shrink-0" />
          {(!collapsed || mobile) && <span>退出登录</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F9FAFB] dark:bg-[#0F172A]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 left-0 w-[280px] h-full bg-white dark:bg-[#1E293B] flex flex-col z-10 shadow-lg">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      <div className={`${collapsed ? 'w-16' : 'w-[220px]'} bg-white dark:bg-[#1E293B] border-r border-[#E2E8F0] dark:border-[#334155] hidden md:flex flex-col shrink-0 transition-all duration-200`}>
        {sidebarContent()}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#334155] px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#334155] text-[#64748B]">
            <IconMenu2 size={20} strokeWidth={2} />
          </button>
          <h1 className="text-sm font-bold text-[#111827] dark:text-[#F1F5F9]">Sales Center</h1>
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
