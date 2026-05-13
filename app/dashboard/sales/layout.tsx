'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: '📊', label: '仪表盘', href: '/dashboard/sales' },
  { icon: '📋', label: '问卷管理', href: '/dashboard/sales/surveys' },
  { icon: '📝', label: '操作记录', href: '/dashboard/sales/my-logs' },
];

export default function SalesLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
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
      <div className="flex h-screen bg-[#F9FAFB] items-center justify-center">
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
      <div className={`${collapsed && !mobile ? 'px-3 py-4' : 'px-5 py-5'} border-b border-[#E5E7EB] flex items-center gap-3`}>
        {(!collapsed || mobile) && (
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold tracking-tight text-[#111827]">Sales Center</h1>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">销售工作台</p>
          </div>
        )}
        {mobile ? (
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#374151] transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        ) : (
          <button onClick={() => setCollapsed(v => !v)} className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#374151] transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const showLabel = mobile || !collapsed;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => mobile && setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors no-underline ${
                    active ? 'bg-[#FEF3C7] text-[#92400E] font-medium' : 'text-[#374151] hover:bg-[#F3F4F6] hover:text-[#111827]'
                  }`}
                  title={!showLabel ? item.label : undefined}
                >
                  <span className="text-sm flex-shrink-0">{item.icon}</span>
                  {showLabel && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`${collapsed && !mobile ? 'px-2' : 'px-4'} py-3 border-t border-[#E5E7EB]`}>
        {(!collapsed || mobile) && (
          <div className="text-[11px] text-[#9CA3AF] mb-2">销售</div>
        )}
        {isAdmin && (
          <Link
            href="/dashboard/koala"
            className="block w-full text-left text-[13px] text-[#6B7280] hover:text-[#111827] transition px-2 py-1.5 rounded hover:bg-[#F3F4F6] no-underline mb-1"
            title="管理后台"
          >
            {collapsed && !mobile ? '⚙️' : '⚙️ 管理后台'}
          </Link>
        )}
        <Link
          href="/koala/home"
          className="block w-full text-left text-[13px] text-[#6B7280] hover:text-[#111827] transition px-2 py-1.5 rounded hover:bg-[#F3F4F6] no-underline mb-1"
          title="返回主页"
        >
          {collapsed && !mobile ? '🏠' : '🏠 返回主页'}
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-[13px] text-[#6B7280] hover:text-[#111827] transition px-2 py-1.5 rounded hover:bg-[#F3F4F6]"
          title="退出登录"
        >
          {collapsed && !mobile ? '🚪' : '退出登录'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="absolute top-0 left-0 w-[280px] h-full bg-white flex flex-col z-10 shadow-lg">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      <div className={`${collapsed ? 'w-16' : 'w-60'} bg-white border-r border-[#E5E7EB] hidden md:flex flex-col shrink-0 transition-all duration-200`}>
        {sidebarContent()}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-[#111827]">Sales Center</h1>
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
