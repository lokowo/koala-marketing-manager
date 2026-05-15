## Why

顶部导航目前有 5 项（发现/教授&学者库/Koala AI/博客/我的），信息架构略显平铺。用户反馈导航项过多、"系统"入口不应暴露给普通用户。需要精简导航为 4 项，将博客收纳到首页内，将系统管理入口移到"我的"页面（已有角色判断逻辑）。

## What Changes

- 顶部 + 底部导航栏精简为 4 项：首页 / Koala AI / 教授库 / 我的
- 「发现」改名「首页」，保留原有内容
- 「教授&学者库」改名「教授库」
- 移除「博客」导航项（/koala/blog 路由保留，直接访问仍可用）
- 移除「系统」导航项（如存在）
- 「首页」页面新增博客预览板块（3-6 篇卡片 + "查看更多"链接）
- 「我的」页面已有系统管理入口（角色判断 admin/sales/super_admin），无需额外修改

## Capabilities

### New Capabilities
- `homepage-blog-section`: 首页新增博客预览板块，展示最新博客文章卡片

### Modified Capabilities

## Impact

- `app/koala/components/TopNavBar.tsx` — 导航项数组修改
- `app/koala/components/BottomTabBar.tsx` — 移动端底部导航同步修改
- `app/koala/discover/page.tsx` — 新增博客预览板块
- `/koala/blog` 路由保持可用，SEO 不受影响
- 「我的」页面已有管理入口，无代码改动
