## Context

当前导航结构（TopNavBar.tsx + BottomTabBar.tsx）有 5 项：发现/教授&学者库/Koala AI/博客/我的。需要精简为 4 项，将博客收纳到首页。

关键文件：
- `app/koala/components/TopNavBar.tsx` — NAV_ITEMS 数组定义导航项
- `app/koala/components/BottomTabBar.tsx` — 移动端底部导航
- `app/koala/discover/page.tsx` — 发现页（Tinder 式教授滑卡）
- `app/koala/home/HomeClient.tsx` — 已有博客板块（lines 546-593），展示 2-4 篇博客卡片
- `app/koala/my-profile/page.tsx` — 已有角色判断的管理入口

## Goals / Non-Goals

**Goals:**
- 导航精简为 4 项：首页 / Koala AI / 教授库 / 我的
- 首页（/koala/discover）新增博客预览板块
- 所有现有路由保持可用

**Non-Goals:**
- 不修改「我的」页面（管理入口已实现）
- 不修改博客页面本身
- 不改变路由结构

## Decisions

### 1. 博客板块添加位置
在 discover 页面底部添加博客预览区域，位于现有教授滑卡内容之后。复用 HomeClient.tsx 中已有的博客卡片样式。通过 Supabase 查询最新 6 篇已发布博客文章。

### 2. 导航项修改方式
直接修改 TopNavBar.tsx 和 BottomTabBar.tsx 中的 NAV_ITEMS 数组：
- 移除 blog 项
- 重命名 label 字段
- 保持路由路径不变（/koala/discover）

### 3. 数据获取
discover 页面当前是客户端渲染。博客数据通过 Supabase 客户端查询获取，与现有教授数据查询模式一致。

## Risks / Trade-offs

- [博客 SEO] → /koala/blog 路由保留，不影响搜索引擎索引
- [导航项减少] → 博客通过首页板块 + 直链保持可达性
