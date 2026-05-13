## Context

首页三步卡片（`app/koala/home/page.tsx` L371-408）和教授列表卡片（`app/koala/professors/page.tsx` ProfCard L912-1040）在浅色模式下视觉层次不足。当前白色卡片仅有细边框 `border-gray-200`，hover 效果有限，缺少装饰元素。

两个组件均已支持 `dark:` 前缀的深色模式，本次改动需保持深色模式兼容。

## Goals / Non-Goals

**Goals:**
- 浅色模式下卡片具有明确的视觉层次（阴影、hover 动效、装饰元素）
- 深色模式行为不退化
- 纯 CSS/Tailwind 实现，零 JS 逻辑变更

**Non-Goals:**
- 不修改卡片数据结构或 API 调用
- 不引入动画库（framer-motion 等）
- 不修改首页热门导师区域的内联卡片（那是不同组件）

## Decisions

### 1. 使用 Tailwind `group` + `group-hover` 实现装饰条

**选择**: 用 `group` class 在容器上，装饰条用 `opacity-0 group-hover:opacity-100` 切换。

**替代方案**: CSS `::before` 伪元素 — 但 Tailwind 的 `before:` 语法冗长，且不易控制渐变。

**理由**: `group-hover` 是 Tailwind 原生模式，代码可读性好，团队熟悉。

### 2. 三步卡片第一张使用绝对定位装饰圆形

**选择**: 在按钮内部添加两个 `absolute` 定位的 `div`，半透明圆形作为装饰。

**理由**: 不影响内容布局，`overflow-hidden` 裁剪超出部分，纯视觉装饰。

### 3. 图标背景改为彩色圆角方块

**选择**: 将当前 emoji 直接显示改为 emoji 放在彩色圆角方块内（`rounded-xl` + 背景色）。

**配色**: Step01 金色 `bg-[#D4A843]/15` / Step02 Teal `bg-[#4ECDC4]/15` / Step03 琥珀 `bg-amber-100`。深色模式下降低不透明度。

### 4. 教授卡片研究方向标签去 border

**选择**: 从 `border border-amber-300` 改为纯填充 `bg-amber-50 text-amber-700`，无边框。

**理由**: 减少视觉噪音，与三步卡片标签风格统一。

### 5. 教授卡片统计行改两列布局

**选择**: 用 `grid grid-cols-2` + 分割线 `divide-x` 替代当前 `flex gap-3` 单行。

**理由**: 两列布局在窄屏更整齐，分割线增加结构感。

## Risks / Trade-offs

- **[风险] hover 装饰条在触屏无效** → 可接受，触屏用户靠阴影和边框区分层次，装饰条是增强而非必需。
- **[风险] 装饰圆形在极小屏幕溢出** → `overflow-hidden` 已处理裁剪。
- **[权衡] 第一张卡片始终深色** → 浅色模式下形成对比焦点，这是有意设计。
