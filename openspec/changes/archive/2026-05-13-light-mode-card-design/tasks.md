## 1. 三步卡片改造（app/koala/home/HomeClient.tsx）

- [x] 1.1 第一张卡片添加 `relative overflow-hidden`，插入两个绝对定位装饰圆形（右上金色、左下 Teal）
- [x] 1.2 第二三张卡片添加 `group relative overflow-hidden`，插入 hover 渐变装饰条（`h-1 from-[#4ECDC4] to-[#D4A843] opacity-0 group-hover:opacity-100`）
- [x] 1.3 三张卡片的 emoji 图标改为放在彩色圆角方块内（Step01 金色 / Step02 Teal / Step03 琥珀），添加 `dark:` 变体
- [x] 1.4 第二三张卡片浅色模式 className 更新为 `bg-white border-gray-100 hover:shadow-lg hover:-translate-y-1`，深色 `dark:bg-[#0F1419] dark:border-white/10`

## 2. 教授卡片改造（app/koala/professors/ProfessorsClient.tsx ProfCard）

- [x] 2.1 卡片容器添加 `group relative overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-[#D4A843]/30 transition-all duration-300`
- [x] 2.2 插入 hover 渐变装饰条（`h-1 from-[#D4A843]/60 to-[#4ECDC4]/60 opacity-0 group-hover:opacity-100`）
- [x] 2.3 研究方向标签从 `border border-amber-300 rounded-full` 改为 `bg-amber-50 text-amber-700 rounded-md`，深色 `dark:bg-amber-900/20 dark:text-amber-400`
- [x] 2.4 "查看详情"按钮改为 `bg-gray-50 hover:bg-[#1A1A2E] hover:text-white rounded-xl`，深色 `dark:bg-white/5 dark:text-[#D4A843] dark:hover:bg-[#D4A843] dark:hover:text-[#080C10]`
- [x] 2.5 底部统计行改为 `grid grid-cols-2 divide-x` 两列布局

## 3. 验证

- [x] 3.1 浅色模式下检查三步卡片层次感（装饰圆形、hover 渐变条、图标背景）
- [x] 3.2 深色模式下检查三步卡片不退化
- [x] 3.3 浅色模式下检查教授卡片 hover 效果（渐变条、上移、阴影、按钮变色）
- [x] 3.4 深色模式下检查教授卡片不退化
- [x] 3.5 `npm run build` 确认无编译错误
