## Why

浅色模式下 5 个页面（pricing、my-profile、my-progress、professor-portal、tools）的卡片和区块缺乏视觉层次——白底+细边框在白色页面背景上显得扁平。刚完成的 `light-mode-card-design` 变更为首页三步卡片和教授列表卡片建立了设计语言（hover 渐变条、装饰圆形、阴影层级、amber 标签），但其余页面尚未对齐。pricing 作为付费转化页优先级最高。

## What Changes

**pricing/page.tsx**
- 免费 tier 卡片添加 shadow-sm
- 积分包卡片添加 shadow-sm + hover:shadow-lg + hover:-translate-y-1
- 推荐积分包（最划算）添加渐变边框或装饰元素突出
- 订阅 tier 卡片添加阴影和 hover 上移效果

**my-profile/page.tsx**
- 统计卡片添加 shadow-sm + 彩色图标方块背景
- 信息区块添加微妙阴影
- 可交互元素添加 hover 效果

**my-progress/page.tsx**
- Research Readiness 卡片添加 shadow-sm 和装饰元素
- 统计网格卡片添加 shadow-sm
- 成就徽章解锁状态添加金色光效/渐变边框
- 锁定状态视觉区分增强

**professor-portal/page.tsx**
- Header 卡片和内容区块添加 shadow-sm
- Tab 按钮添加 hover 效果
- 招生 CTA 添加渐变或装饰

**tools/page.tsx**
- 付费 tier 卡片添加 shadow-lg 对齐免费工具区风格
- 推荐 tier 添加突出效果
- 统一所有卡片 hover 行为

## Capabilities

### New Capabilities
- `light-mode-card-polish`: 5 个页面的卡片阴影、hover 动效、装饰元素统一优化

### Modified Capabilities

## Impact

- `app/koala/pricing/page.tsx` — 定价卡片 className
- `app/koala/my-profile/page.tsx` — 统计卡片和信息区块 className
- `app/koala/my-progress/page.tsx` — 进度卡片和成就徽章 className
- `app/koala/professor-portal/page.tsx` — 所有区块 className
- `app/koala/tools/page.tsx` — tier 卡片 className
- 纯样式变更，不影响 API、数据库、路由或业务逻辑
- 不引入新依赖
