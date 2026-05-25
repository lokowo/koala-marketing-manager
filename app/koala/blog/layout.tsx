import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '博客 — 澳洲PhD申请攻略与导师推荐',
  description: '从申请攻略到导师推荐，从奖学金到签证攻略，一站式了解澳洲PhD申请的方方面面。PhD application guides, supervisor recommendations, and scholarship tips.',
  keywords: ['PhD申请攻略', '澳洲博士', '奖学金攻略', 'PhD application guide', '导师推荐', 'Australian scholarship'],
  alternates: { canonical: 'https://koalaphd.com/koala/blog' },
  openGraph: {
    title: '博客 — 澳洲PhD申请攻略与导师推荐 | Koala PhD',
    description: '一站式了解澳洲PhD申请：攻略 · 奖学金 · 导师推荐 · 签证',
    url: 'https://koalaphd.com/koala/blog',
    images: ['/og-image.png'],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
