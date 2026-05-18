## 1. pricing/page.tsx（付费转化页）

- [x] 1.1 免费 tier 外层容器添加 `shadow-sm`
- [x] 1.2 积分包卡片添加 `shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`
- [x] 1.3 推荐积分包（最划算）添加 `ring-2 ring-[#D4A843]/40 shadow-md` 突出
- [x] 1.4 订阅 tier 卡片添加 `shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`，推荐 tier 添加 `shadow-md`
- [x] 1.5 订阅 tier 添加 `group relative overflow-hidden` + hover 渐变条

## 2. my-profile/page.tsx

- [x] 2.1 CARD_CLS 常量已有 `shadow-sm`（已确认，无需修改）
- [x] 2.2 统计卡片在 my-progress 中实现（my-profile 无独立 StatCard 组件）

## 3. my-progress/page.tsx

- [x] 3.1 Research Readiness 卡片添加 `shadow-sm`
- [x] 3.2 统计网格卡片（StatCard）添加 `shadow-sm` + 彩色圆角图标方块
- [x] 3.3 成就徽章解锁状态添加 `ring-2 ring-[#D4A843]/30 shadow-sm`
- [x] 3.4 成就徽章锁定状态改为 `opacity-40 grayscale` + 灰色背景

## 4. professor-portal/page.tsx

- [x] 4.1 Header 卡片已有 `shadow-sm`（已确认）
- [x] 4.2 Stats 网格卡片添加 `shadow-sm`
- [x] 4.3 Tab 按钮添加 `hover:bg-gray-100 dark:hover:bg-white/10`
- [x] 4.4 所有内容区块卡片添加 `shadow-sm`（含 LetterCard、招生 CTA）

## 5. tools/page.tsx

- [x] 5.1 付费 tier 卡片容器添加 `group relative overflow-hidden` + hover 渐变条
- [x] 5.2 推荐 tier 添加 `shadow-md`，普通 tier `shadow-sm`
- [x] 5.3 所有 tier 卡片添加 `hover:-translate-y-1 hover:shadow-lg transition-all duration-300`

## 6. 验证

- [x] 6.1 `npm run build` 确认无编译错误
