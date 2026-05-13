import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '博客 — 澳洲PhD申请攻略与导师推荐',
  description: '从申请攻略到导师推荐，从奖学金到签证攻略，一站式了解澳洲PhD申请的方方面面。',
  openGraph: {
    title: '博客 — 澳洲PhD申请攻略与导师推荐',
    description: '一站式了解澳洲PhD申请',
    images: ['/og-image.png'],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
