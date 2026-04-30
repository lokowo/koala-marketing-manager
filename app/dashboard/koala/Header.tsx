'use client';

import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/dashboard/koala': '仪表盘',
  '/dashboard/koala/blog': '博客管理 — 全部',
  '/dashboard/koala/blog/drafts': '博客管理 — 草稿箱',
  '/dashboard/koala/blog/published': '博客管理 — 已发布',
  '/dashboard/koala/blog/scheduled': '博客管理 — 定时发布',
  '/dashboard/koala/ai-content': 'AI 内容生成 — 单篇',
  '/dashboard/koala/ai-content/batch': 'AI 内容生成 — 批量',
  '/dashboard/koala/ai-content/knowledge': 'AI 内容生成 — 知识库',
  '/dashboard/koala/professors': '教授库管理 — 审核列表',
  '/dashboard/koala/professors/verified': '教授库管理 — 已发布',
  '/dashboard/koala/professors/sync': '教授库管理 — 数据采集',
  '/dashboard/koala/users': '用户管理',
  '/dashboard/koala/settings': '系统设置',
  '/dashboard/koala/grants': '资助数据库',
  '/dashboard/koala/topics': '研究专题库',
  '/dashboard/koala/publishing': '发布追踪',
};

export default function Header() {
  const pathname = usePathname();
  const title = TITLES[pathname] || '仪表盘';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    </header>
  );
}
