## 1. 卡片背景全局替换

- [x] 1.1 全局替换 `dark:bg-white/[0.04]` → `dark:bg-white/5`（app/koala/ 下所有 .tsx）
- [x] 1.2 全局替换 `dark:bg-white/[0.06]` → `dark:bg-white/5`（app/koala/ 下所有 .tsx）
- [x] 1.3 全局替换 `dark:bg-[#111c28]` → `dark:bg-[#0F1419]`（app/koala/ 下所有 .tsx）
- [x] 1.4 my-profile CARD_CLS 中 `dark:bg-[#D4A843]/[0.06]` → `dark:bg-white/5`

## 2. 硬编码 inline style 修复

- [x] 2.1 HomeClient.tsx — 通知行 `rgba(201,169,110,0.06)` 背景改为 Tailwind class
- [x] 2.2 chat/page.tsx — 错误提示 `rgba(176,96,64,0.15)` + `#e08060` 改为 Tailwind class
- [x] 2.3 ProfessorsClient.tsx — AI 深搜按钮 `background: '#a882ff'` 改为 Tailwind class
- [x] 2.4 discover/page.tsx — 渐变按钮 `linear-gradient(...)` 改为 Tailwind class + 全局 `dark:bg-[#D4A843]/[0.06]` → `dark:bg-[#D4A843]/10`

## 3. 非标准色替换

- [x] 3.1 professor-portal — H-index 徽章 `dark:bg-blue-900/30 dark:text-blue-400` → `dark:bg-[#D4A843]/10 dark:text-[#D4A843]`
- [x] 3.2 professor-portal — 浅色模式 `bg-blue-100 text-blue-700` → `bg-amber-50 text-amber-700`；所有 `bg-blue-600` 按钮 → `bg-[#1A1A2E] dark:bg-[#D4A843]`

## 4. 验证

- [x] 4.1 grep 确认无 `dark:bg-white/[0.04]`、`dark:bg-white/[0.06]`、`dark:bg-[#111c28]` 残留
- [x] 4.2 `npm run build` 确认无编译错误
