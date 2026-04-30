import type { Metadata } from 'next';
import BottomTabBar from './components/BottomTabBar';

export const metadata: Metadata = {
  title: 'Koala — 你的澳洲学术内线',
  description: 'AI PhD Advisor：深度理解你的背景，精准匹配澳洲教授，AUD 1 一封定制套磁信。',
};

export default function KoalaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#faf6ec', minHeight: '100svh' }}>
      <div
        className="relative mx-auto"
        style={{ maxWidth: 480, minHeight: '100svh', paddingBottom: '88px' }}
      >
        {children}
      </div>
      <BottomTabBar />
    </div>
  );
}
