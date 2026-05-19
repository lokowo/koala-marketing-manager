## Why

首页"最新博客"板块目前是 2×2 静态网格，移动端只显示 2 篇，桌面端 4 篇。用户无法快速浏览更多内容，博客曝光率低。改为横向滚动轮播可在同样空间内展示 6-8 篇文章，提升博客点击率和内容发现效率。

## What Changes

- 将博客板块从 `grid grid-cols-1 md:grid-cols-2` 改为横向滚动容器（overflow-x + scroll-snap）
- 卡片固定宽度 320px（移动端 280px），一行排列可左右滑动
- 桌面端增加左右箭头按钮（hover 显示，到边界隐藏）
- 移动端依赖原生触摸滑动，无箭头
- 底部可选圆点指示器
- 数据层：博客加载数量从 4 篇增至 8 篇
- 隐藏滚动条（CSS webkit-scrollbar: none + scrollbar-width: none）

## Capabilities

### New Capabilities
- `homepage-blog-carousel`: 首页博客横向滚动轮播组件，含 scroll-snap 吸附、桌面端箭头导航、移动端触摸滑动

### Modified Capabilities
<!-- 无需修改现有 spec -->

## Impact

- **文件**: `app/koala/home/HomeClient.tsx`（博客板块 UI 重写）、`app/koala/home/page.tsx`（博客查询 limit 从 4 改为 8）
- **API**: 无新增 API，仅调整 Supabase 查询 limit
- **依赖**: 无新增依赖，纯 CSS + React state 实现
- **风险**: 低——仅影响首页博客展示区域，不涉及数据模型或 API 变更
