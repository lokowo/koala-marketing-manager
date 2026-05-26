import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: '订阅方案 & 积分包 — Koala PhD 考拉博士',
  description: '选择适合你的订阅方案或积分包。免费版每天 10 轮 AI 对话，付费版解锁完整教授数据、PDF 报告和无限套磁信生成。Pricing plans for PhD application tools.',
  alternates: { canonical: 'https://koalaphd.com/koala/pricing' },
  openGraph: {
    title: '订阅方案 — Koala PhD',
    description: '免费版每天 10 轮 AI 对话，付费版解锁完整教授数据和无限套磁信。',
    url: 'https://koalaphd.com/koala/pricing',
  },
  twitter: {
    card: 'summary_large_image',
    title: '订阅方案 — Koala PhD',
    description: '免费版每天 10 轮 AI 对话，付费版解锁完整教授数据和无限套磁信。',
  },
};

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Koala PhD Pro 订阅',
  description: '澳洲PhD申请AI平台专业版 — 无限AI对话、完整教授数据、PDF报告和套磁信生成。',
  brand: { '@type': 'Brand', name: 'Koala PhD' },
  offers: [
    {
      '@type': 'Offer',
      name: '免费版',
      price: '0',
      priceCurrency: 'AUD',
      description: '每天10轮AI对话，基础教授搜索',
    },
    {
      '@type': 'Offer',
      name: 'Pro 月订阅',
      price: '19.90',
      priceCurrency: 'AUD',
      description: '无限AI对话，完整教授数据，PDF报告，套磁信生成',
      url: 'https://koalaphd.com/koala/pricing',
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <PricingClient />
    </>
  );
}
