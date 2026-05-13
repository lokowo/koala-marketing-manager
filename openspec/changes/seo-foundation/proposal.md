## Why

Koala PhD 的核心 SEO 资产——4,200+ 教授详情页和博客文章——目前全部使用 `'use client'` 客户端渲染。Google 爬虫看到的是空壳 HTML，导致这些页面几乎无法被索引。同时缺少结构化数据、完整 sitemap、和正确的 OG image，严重限制了自然搜索流量。

中文留学 SEO 是蓝海市场（"澳洲PhD申请"、"澳洲博导推荐"等关键词竞争低），修复这些基础问题能让网站开始获取免费的 Google 自然流量。

## What Changes

- 教授详情页 `/koala/professors/[id]` 改为 Server Component + ISR（每周重新验证）
- 博客详情页 `/koala/blog/[id]` 改为 Server Component + ISR（每天重新验证）
- 首页 `/koala/home` 关键内容改为 Server Component
- 教授列表页 `/koala/professors` 改为 SSR + 客户端交互层
- Sitemap 加入所有教授页面（当前只有博客页面）
- 添加 Organization JSON-LD（首页）、Person JSON-LD（教授页）、BreadcrumbList JSON-LD（全站）
- OG image 从 SVG 换为 1200×630 PNG
- 添加 canonical 标签到动态页面
- 填入 Google Search Console 验证码

## Capabilities

### New Capabilities
- `ssr-rendering`: 将关键 SEO 页面从 CSR 改为 SSR/ISR，确保 Google 爬虫能索引完整内容
- `structured-data`: 添加 Organization、Person、BreadcrumbList JSON-LD 结构化数据
- `sitemap-enhancement`: 扩展 sitemap 覆盖所有教授页面，补全 canonical 和 OG 元数据

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Pages affected**: `/koala/professors/[id]`, `/koala/blog/[id]`, `/koala/home`, `/koala/professors`
- **Rendering model**: CSR → SSR/ISR，需要将数据获取从 `useEffect` 移到 Server Component
- **Sitemap**: `app/sitemap.ts` 需要查询 professors 表
- **Metadata**: `app/koala/layout.tsx` 需要更新 Google 验证码和 OG image
- **New files**: JSON-LD 组件、PNG OG image
- **No new dependencies required**
