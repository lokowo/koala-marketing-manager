'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '../../lib/theme';
import { AuthProvider } from './AuthContext';
import TopNavBar from './TopNavBar';
import BottomTabBar from './BottomTabBar';

export default function KoalaShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-svh bg-white dark:bg-[#080c10] text-gray-900 dark:text-[#e8e4dc] transition-colors">
          <TopNavBar />
          <div className="relative mx-auto max-w-[480px] lg:max-w-6xl">
            <div className="lg:pt-16 pb-[88px] lg:pb-8">
              {children}
            </div>
          </div>
          <div className="lg:hidden">
            <BottomTabBar />
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
