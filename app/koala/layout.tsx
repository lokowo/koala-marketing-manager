import type { Metadata } from 'next';
import BottomTabBar from './components/BottomTabBar';
import TopNavBar from './components/TopNavBar';
import { AuthProvider } from './components/AuthContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://koalaphd.com'),
  title: {
    default: 'Koala PhD — 找到你的澳洲博导',
    template: '%s | Koala PhD',
  },
  description: 'AI 智能匹配澳洲 4,200+ 位教授，一键生成套磁信。PhD 申请、奖学金、导师推荐，考拉学长帮你搞定。',
  keywords: ['澳洲PhD', 'PhD申请', '博士申请', '澳洲留学', '导师推荐', '套磁信', 'Australian PhD', 'PhD supervisor', 'scholarship Australia'],
  authors: [{ name: 'Koala PhD' }],
  creator: 'Koala PhD',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: 'en_AU',
    url: 'https://koalaphd.com',
    siteName: 'Koala PhD',
    title: 'Koala PhD — 找到你的澳洲博导',
    description: 'AI 智能匹配澳洲 4,200+ 位教授，一键生成套磁信',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'Koala PhD' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Koala PhD — 找到你的澳洲博导',
    description: 'AI 智能匹配澳洲教授，一键生成套磁信',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  verification: {
    google: '',
  },
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
