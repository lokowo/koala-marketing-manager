import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 智能对话 — Ola学姐 PhD Advisor',
  description: '与Ola学姐 AI 一对一对话，获取澳洲 PhD 申请路径评估、导师匹配、科研方向深潜和套磁信撰写指导。',
  keywords: ['PhD advisor', 'AI对话', '澳洲PhD申请', 'PhD supervisor matching', '博士申请指导', '套磁信'],
  alternates: { canonical: 'https://koalaphd.com/koala/chat' },
  openGraph: {
    title: 'AI PhD Advisor — Ola学姐 | Koala PhD',
    description: '免费 AI 对话：路径评估 · 导师匹配 · 科研深潜 · 套磁信撰写',
    url: 'https://koalaphd.com/koala/chat',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI PhD Advisor — Ola学姐',
    description: '免费 AI 对话：路径评估 · 导师匹配 · 科研深潜 · 套磁信撰写',
  },
  robots: { index: true, follow: true },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
