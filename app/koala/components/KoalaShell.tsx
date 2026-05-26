'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '../../lib/theme';
import { AuthProvider } from './AuthContext';
import { GmailProvider } from './GmailContext';
import TopNavBar from './TopNavBar';
import BottomTabBar from './BottomTabBar';
import OlaFloatingMascot from '../../components/OlaFloatingMascot';
import { OlaTriggerEngine } from './ola/OlaTriggerEngine';

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onChatPage = pathname.startsWith('/koala/chat');
  const onAuthPage = pathname.startsWith('/koala/auth');

  return (
    <div className="min-h-svh bg-[#F8FAFC] dark:bg-[#080c10] text-gray-900 dark:text-[#e8e4dc] transition-colors">
      {!onAuthPage && <TopNavBar />}
      <div className="relative mx-auto max-w-[480px] lg:max-w-6xl">
        <div className={onAuthPage ? '' : onChatPage ? 'lg:pt-16' : 'lg:pt-16 pb-[88px] lg:pb-8'}>
          {children}
        </div>
      </div>
      {!onAuthPage && !onChatPage && (
        <div className="lg:hidden">
          <BottomTabBar />
        </div>
      )}
      {!onAuthPage && (
        <>
          {!onChatPage && (
            <div className="fixed bottom-[104px] right-4 lg:bottom-6 lg:right-6 z-[9999]">
              <OlaTriggerEngine />
            </div>
          )}
          <OlaFloatingMascot />
        </>
      )}
    </div>
  );
}

export default function KoalaShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GmailProvider>
          <ShellInner>{children}</ShellInner>
        </GmailProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
