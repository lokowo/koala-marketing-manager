## Context

`/koala/pricing/page.tsx` 已是完整的定价页面（550 行），含订阅套餐、积分充值包、升降级、FAQ、购买记录。`/koala/tools/page.tsx` 中重复了积分充值包 UI 和 Stripe checkout 逻辑。TopNavBar 和 BottomTabBar 均无定价入口。

## Goals / Non-Goals

**Goals:**
- tools 页面只保留免费工具箱，移除充值/订阅相关内容
- 全站 3 个入口指向 `/koala/pricing`：顶部导航、"我的"积分区、tools 页引导
- tools 页面标题改为"免费工具箱"

**Non-Goals:**
- 不修改 pricing 页面本身（已完整）
- 不修改 BottomTabBar（4 个固定 tab 不变）
- 不修改积分不足弹窗（已有 `/koala/pricing` 链接）

## Decisions

### 1. tools 页面保留内容
保留：免费工具网格 + "查看订阅套餐" CTA banner + 人工咨询卡片 + 免费工具提醒 + 底部 "需要更多积分？" 引导链接
移除：积分充值包网格 + 积分使用说明 + handleCheckout 函数 + CREDIT_PACKAGES import + Stripe 相关 import

### 2. TopNavBar 添加定价链接
在 NAV_ITEMS 数组中加 `{ href: '/koala/pricing', icon: CreditCard, label: '定价' }`，放在"教授库"和"我的"之间。使用 lucide-react 的 CreditCard 图标。

### 3. "我的"页面积分区域加按钮
在积分卡片的"查看积分明细 →"旁边，加一个"充值/订阅 →"链接按钮，指向 `/koala/pricing`。

## Risks / Trade-offs

- **[tools 页变短]** → 保留 CTA banner 和引导链接，避免页面过于空白
