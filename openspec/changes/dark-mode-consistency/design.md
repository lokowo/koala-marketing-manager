## Context

深色模式在多个开发周期中逐步添加，导致卡片背景、边框、强调色出现 5+ 种写法。需要统一到两种标准。大部分替换可用 `replace_all` 全局完成。

## Goals / Non-Goals

**Goals:**
- 卡片背景收敛到 2 种：`dark:bg-white/5`（轻卡片）和 `dark:bg-[#0F1419]`（重卡片/下拉菜单/输入框）
- 消除硬编码 inline style 的深色模式盲区
- professor-portal 蓝色系替换为金色系

**Non-Goals:**
- 不修改 amber 强调背景 `dark:bg-[#D4A843]/[0.06]`（用于 `bg-amber-50` 的深色对应，这是有意设计）
- 不修改浅色模式样式
- 不修改业务逻辑

## Decisions

### 1. 卡片背景映射规则

| 浅色模式 | 深色模式标准 | 替换的旧值 |
|----------|------------|-----------|
| `bg-white` / `bg-gray-50` / `bg-gray-100` | `dark:bg-white/5` | `dark:bg-white/[0.04]`、`dark:bg-white/[0.06]` |
| `bg-white`（独立区块/下拉/输入）| `dark:bg-[#0F1419]` | `dark:bg-[#111c28]` |
| `bg-amber-50`（强调背景）| `dark:bg-[#D4A843]/[0.06]`（保留）| — |

**理由**: `white/5` 和 `white/[0.04]`、`white/[0.06]` 视觉差异极小（4%/5%/6%不透明度），统一到 5% 是 Tailwind 标准写法。`[#111c28]` 和 `[#0F1419]` 色值接近，统一到后者。

### 2. my-profile CARD_CLS 特殊处理

CARD_CLS 当前用 `dark:bg-[#D4A843]/[0.06]`，这是卡片背景而非 amber 强调，改为 `dark:bg-white/5`。

### 3. 硬编码 style 处理方式

优先改为 Tailwind class。若 Tailwind 无法表达（如复杂渐变），使用 `useTheme` 或条件 className。

### 4. chat/page.tsx `dark:bg-white/[0.06]` 保留评估

chat 页面有 14 处 `dark:bg-white/[0.06]`，用于消息气泡、按钮等。这些统一到 `dark:bg-white/5` 视觉变化微小（6%→5%），可安全替换。

## Risks / Trade-offs

- **[风险] 全局替换可能改到不应改的位置** → 仅在 `app/koala/` 目录下替换，逐文件确认。
- **[权衡] amber 强调背景保留 `[0.06]`** → 这些是有意的金色底色，与卡片背景用途不同，不统一。
