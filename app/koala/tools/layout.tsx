import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '免费工具箱 — GPA换算、签证预评、PhD路径自评',
  description: '免费在线工具：中国GPA转换澳洲标准、NIV签证条件预评估、PhD申请竞争力自测、ARC科研项目浏览。无需注册即可使用。',
  keywords: ['GPA换算', 'NIV签证评估', 'PhD申请工具', 'Australian visa assessment', '澳洲留学工具'],
  openGraph: {
    title: '免费工具箱 | Koala PhD',
    description: 'GPA换算 · 签证预评 · PhD路径自评 · ARC项目浏览',
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
