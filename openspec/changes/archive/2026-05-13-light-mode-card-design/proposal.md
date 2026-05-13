## Why

浅色模式下，首页三步卡片和教授列表卡片视觉层次感不足——白色卡片在白色背景上显得扁平，缺少交互反馈和装饰元素。需要通过 hover 动效、渐变装饰条、彩色图标背景和阴影提升卡片的质感和层次感，同时保持深色模式兼容。

## What Changes

**三步卡片（首页 `app/koala/home/page.tsx` Three Steps section）**
- 第一张卡片（聊背景）：保持深色渐变背景，新增两个装饰性半透明圆形（右上金色、左下 Teal）
- 第二三张卡片：白色背景 + hover 时顶部出现金色→Teal 渐变装饰条 + 上移 + 阴影增强
- 图标背景改为彩色圆角方块（Step01 金色 / Step02 Teal / Step03 琥珀），替代当前 emoji 直接显示
- 底部附加信息保留（约2分钟 / 30秒出结果 / 支持批量）
- HOW IT WORKS 标签样式改为金色系（`bg-amber-50 text-amber-700`），当前已经是此配色，确认保持
- 所有样式通过 `dark:` 前缀同时支持深色模式

**教授卡片（`app/koala/professors/page.tsx` ProfCard 组件）**
- 卡片容器：hover 时上移 + 顶部渐变装饰条（金色→Teal）+ 阴影增强 + 边框高亮
- 使用 `group` + `group-hover` 实现装饰条 hover 显隐
- 研究方向标签改为 amber 色系（`bg-amber-50 text-amber-700`），移除当前 border 样式
- "查看详情"按钮改为圆角按钮，hover 变深色填充
- 大学彩色徽章保持不变
- 底部统计行改为两列布局 + 分割线
- 全部样式通过 `dark:` 前缀兼容深色模式

## Capabilities

### New Capabilities
- `card-visual-hierarchy`: 卡片视觉层次系统——装饰元素（渐变条、圆形）、hover 动效（上移、阴影）、彩色图标背景的统一设计规范

### Modified Capabilities

## Impact

- `app/koala/home/page.tsx` — Three Steps section 的 JSX 结构和 className
- `app/koala/professors/page.tsx` — ProfCard 组件的 JSX 结构和 className
- 纯样式变更，不影响 API、数据库、路由或业务逻辑
- 不引入新依赖
