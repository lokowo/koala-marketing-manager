'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import { useLanguage } from '../../components/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { supabase } from '../../lib/supabase/client';
import type { UserRole } from '../../lib/auth';

export default function KoalaLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const nav = t.layout.nav;
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const navItems = [
    { href: '/dashboard/koala', label: nav.dashboard },
    { href: '/dashboard/koala/professors', label: nav.professors },
    { href: '/dashboard/koala/grants', label: nav.grants },
    { href: '/dashboard/koala/topics', label: nav.topics },
    { href: '/dashboard/koala/publishing', label: nav.publishing },
  ];

  if (!authChecked) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <p className="text-slate-400 text-sm">验证身份中…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">{t.layout.sidebarTitle}</h1>
          <p className="text-sm text-slate-400">{t.layout.sidebarSubtitle}</p>
        </div>
        <nav className="flex-1 px-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-4 py-2 rounded-lg hover:bg-slate-800 transition"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {role === 'super_admin' && (
              <li>
                <Link
                  href="/dashboard/koala/users"
                  className="block px-4 py-2 rounded-lg hover:bg-slate-800 transition text-emerald-400"
                >
                  用户管理
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <div className="p-4 space-y-3">
          <LanguageSwitcher />
          <button
            onClick={handleSignOut}
            className="block w-full text-left text-sm text-slate-400 hover:text-white transition"
          >
            退出登录
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
