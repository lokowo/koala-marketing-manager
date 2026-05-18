## Context

5 个前台页面在浅色模式下视觉层次不足。已有设计语言来自 `light-mode-card-design` 变更，本次复用这些模式统一应用到剩余页面。所有页面已有 `dark:` 前缀支持，本次仅增强浅色模式表现并保持深色兼容。

## Goals / Non-Goals

**Goals:**
- 5 个页面浅色模式卡片层次感与首页/教授列表对齐
- 复用已建立的设计语言（渐变条、装饰圆、阴影层级）
- 深色模式不退化

**Non-Goals:**
- 不修改页面布局结构
- 不修改业务逻辑或数据流
- 不修改已经 GOOD 的页面（home、chat、discover、matches、blog）

## Decisions

### 1. 卡片阴影层级标准

| 类型 | 默认 | Hover |
|------|------|-------|
| 信息展示卡 | shadow-sm | 不变 |
| 可点击卡 | shadow-sm | shadow-lg + -translate-y-1 |
| 重点推荐卡 | shadow-md | shadow-xl + -translate-y-1 |

深色模式下阴影使用 `dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]`。

### 2. pricing 推荐套餐突出方式

**选择**: 推荐积分包使用 `ring-2 ring-[#D4A843]/40 shadow-md`，配合 group + hover 渐变条。

**替代方案**: 渐变背景填充 — 但会与深色模式的暗背景冲突。

### 3. 成就徽章视觉区分

**选择**: 解锁成就使用 `ring-2 ring-[#D4A843]/30 shadow-sm`，锁定成就使用 `opacity-40 grayscale`。

### 4. 统计卡片图标背景

**选择**: 复用彩色圆角方块模式 `w-9 h-9 rounded-xl bg-color/15 flex items-center justify-center`。

### 5. professor-portal Tab hover

**选择**: Tab 按钮添加 `hover:bg-gray-100 dark:hover:bg-white/10 transition-colors`。

## Risks / Trade-offs

- **[风险] my-profile 1932 行文件较大** → 仅修改 CARD_CLS 常量和少量 className，影响面可控。
- **[权衡] 触屏无 hover** → 与之前变更一致，hover 为增强而非必需。
