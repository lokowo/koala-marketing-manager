import type { Metadata } from 'next';
import BottomTabBar from './components/BottomTabBar';
import TopNavBar from './components/TopNavBar';
import { AuthProvider } from './components/AuthContext';

export const metadata: Metadata = {
  title: 'Koala — 你的澳洲学术内线',
  description: 'AI PhD Advisor：深度理解你的背景，精准匹配澳洲教授，AUD 1 一封定制套磁信。',
};

export default function KoalaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ backgroundColor: '#faf6ec', minHeight: '100svh' }}>
        {/* Desktop top nav — hidden on mobile */}
        <TopNavBar />

        {/* Content container: mobile=480px centered, desktop=full 6xl */}
        <div className="relative mx-auto max-w-[480px] lg:max-w-6xl">
          {/* On desktop, add top padding for the fixed TopNavBar */}
          <div className="lg:pt-16 pb-[88px] lg:pb-8">
            {children}
          </div>
        </div>

        {/* Mobile bottom tab — hidden on desktop */}
        <div className="lg:hidden">
          <BottomTabBar />
        </div>
      </div>
    </AuthProvider>
  );
}
