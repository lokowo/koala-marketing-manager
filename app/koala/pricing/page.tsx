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
};

export default function PricingPage() {
  return <PricingClient />;
}
