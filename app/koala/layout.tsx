import type { Metadata } from 'next';
import BottomTabBar from './components/BottomTabBar';
import TopNavBar from './components/TopNavBar';
import { AuthProvider } from './components/AuthContext';

export const metadata: Metadata = {
  title: 'Koala PhD — 找到你的澳洲博导',
  description: '学术双向撮合平台：AI 精准匹配澳洲教授，一键生成定制申请信。',
};

export default function KoalaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ backgroundColor: '#080c10', minHeight: '100svh', color: '#e8e4dc' }}>
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
  );
}
