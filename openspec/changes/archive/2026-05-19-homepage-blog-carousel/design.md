## Context

首页博客板块（`app/koala/home/HomeClient.tsx` 第 546-593 行）当前使用 `grid grid-cols-1 md:grid-cols-2` 布局，展示最多 4 篇文章。移动端仅显示前 2 篇（后 2 篇 `hidden md:flex`）。数据在 `page.tsx` 服务端组件中从 Supabase 查询，limit 为 4。

## Goals / Non-Goals

**Goals:**
- 博客板块改为横向滚动轮播，展示 6-8 篇文章
- 桌面端提供左右箭头导航
- 移动端原生触摸滑动
- scroll-snap 吸附效果
- 零新依赖，纯 CSS + React useRef/useState

**Non-Goals:**
- 自动轮播/定时切换（用户手动控制即可）
- 虚拟滚动/懒加载卡片（8 张卡片无需优化）
- 博客卡片样式重设计（保持现有卡片外观）

## Decisions

### 1. 滚动容器方案：原生 CSS scroll-snap
- `overflow-x: auto` + `scroll-snap-type: x mandatory` + `scroll-snap-align: start`
- **替代方案**: Swiper.js / Embla Carousel — 引入额外依赖，违反项目规则
- **理由**: 8 张卡片场景简单，原生 CSS 完全胜任，无需 JS 库

### 2. 箭头导航：useRef + scrollBy
- 用 `useRef<HTMLDivElement>` 引用滚动容器
- 箭头点击调用 `containerRef.current.scrollBy({ left: ±336, behavior: 'smooth' })`（卡片宽 320 + gap 16）
- 监听 `scroll` 事件判断是否到边界，隐藏对应箭头
- 移动端通过 `hidden md:flex` 隐藏箭头

### 3. 滚动条隐藏
- Tailwind 自带 `scrollbar-hide` 不一定可用，用内联样式或全局 CSS：
  - `scrollbar-width: none`（Firefox）
  - `::-webkit-scrollbar { display: none }`（Chrome/Safari）

### 4. 卡片宽度
- 桌面端 320px，移动端 280px — 用 Tailwind `w-[280px] md:w-[320px] flex-shrink-0`
- 容器 padding-right 等于一个卡片宽度的一半，让用户看到"还有更多"的视觉提示

### 5. 数据查询
- `page.tsx` 中 Supabase 查询 limit 从 4 改为 8
- `HomeClient.tsx` 中 `displayPosts.slice(0, 4)` 改为展示全部

## Risks / Trade-offs

- **[触摸设备箭头判断]** → 不在移动端显示箭头，完全依赖触摸滑动
- **[博客不足 8 篇]** → 有多少显示多少，少于 3 篇时箭头不显示（容器无溢出）
- **[scroll 事件性能]** → 用 `passive: true` 监听，仅更新两个 boolean state，开销极低
