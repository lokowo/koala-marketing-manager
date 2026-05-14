## Why

深色模式下卡片背景至少有 5 种写法（`dark:bg-white/[0.04]`、`dark:bg-white/[0.06]`、`dark:bg-[#111c28]`、`dark:bg-[#D4A843]/[0.06]`、`dark:bg-white/5`），分布在 20+ 文件共 100+ 处。另外有 5+ 处硬编码 `style={{ }}` 颜色无深色模式变体，professor-portal 使用了与全站金色调性不统一的蓝色系。需要全面统一以保持视觉一致性。

## What Changes

**P1：卡片背景统一（全局替换，影响最大）**
- `dark:bg-white/[0.04]` (21处) → `dark:bg-white/5`
- `dark:bg-white/[0.06]` (14处) → `dark:bg-white/5`
- `dark:bg-[#111c28]` (33处) → `dark:bg-[#0F1419]`
- my-profile CARD_CLS 中 `dark:bg-[#D4A843]/[0.06]` → `dark:bg-white/5`

**P2：硬编码 inline style 修复**
- HomeClient.tsx 通知行 `rgba(201,169,110,0.06)` 背景
- chat/page.tsx 错误提示 `rgba(176,96,64,0.15)` + `#e08060`
- ProfessorsClient.tsx AI 深搜按钮 `background: '#a882ff'`
- discover/page.tsx 渐变按钮 `linear-gradient(...)`

**P3：非标准色替换**
- professor-portal 蓝色系 (`dark:bg-blue-900/30`、`dark:text-blue-400`) → 金色系

## Capabilities

### New Capabilities
- `dark-mode-palette-standard`: 深色模式调色板统一标准

### Modified Capabilities

## Impact

- 20+ 前台 `.tsx` 文件的 className
- 纯样式变更，不影响业务逻辑
- 大部分可通过全局 replace_all 完成
