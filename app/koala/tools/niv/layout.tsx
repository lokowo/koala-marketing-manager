import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NIV 澳洲签证预评估 — 免费在线工具',
  description: '免费评估你的澳洲学生签证 (500) 申请条件。基于澳洲移民局 DOHA 官方标准，快速了解签证申请的准备程度。',
  keywords: ['澳洲签证评估', 'NIV assessment', 'student visa 500', '澳洲学生签证', 'visa assessment tool'],
  openGraph: {
    title: 'NIV 签证预评估 | Koala PhD',
    description: '免费评估澳洲学生签证申请条件，基于 DOHA 官方标准。',
  },
};

export default function NivLayout({ children }: { children: React.ReactNode }) {
  return children;
}
