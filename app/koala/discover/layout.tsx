import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '发现导师 — 智能滑动匹配 PhD Supervisors',
  description: '像 Tinder 一样滑动浏览澳洲 PhD 导师。AI 根据你的研究兴趣智能推荐最匹配的博士生导师。',
  keywords: ['PhD supervisor', '澳洲导师匹配', 'Australian PhD', '博导推荐', '导师发现'],
  openGraph: {
    title: '发现导师 — 智能匹配 | Koala PhD',
    description: '滑动浏览澳洲 PhD 导师，AI 智能推荐最匹配的博士生导师。',
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
