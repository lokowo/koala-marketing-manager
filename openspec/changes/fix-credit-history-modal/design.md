## Context

用户点击「查看积分明细 →」按钮（`my-profile/page.tsx` line 1018）触发 `setShowCreditsDetail(true)`，但渲染区域在 line 1568（页面底部右栏深处），距离按钮约 500 行 DOM 元素。用户视觉上无反馈。

现有数据流已完整：
- `credit_transactions` 表含 `id`, `user_id`, `amount`, `balance_after`, `type`, `description`, `created_at`
- `GET /api/user/credits` 已查询该表（当前 `limit(10)`）
- 前端 `creditTxs` state 已存储交易数据

## Goals / Non-Goals

**Goals:**
- 点击按钮后立即弹出 Modal，用户无需滚动即可查看积分明细
- 展示完整交易历史（移除 10 条限制），支持滚动浏览
- 每行显示：时间、类型 badge、描述、变动金额（绿/红）、变动后余额
- 保持现有深浅色主题适配

**Non-Goals:**
- 不做分页/无限滚动（积分交易量有限，一次加载即可）
- 不做筛选/搜索（本期不需要）
- 不新建独立页面（Modal 足够）
- 不修改积分获取/消耗逻辑

## Decisions

### 1. Modal 而非内联展开

**选择:** 覆盖式 Modal（fixed 定位，半透明遮罩 + 居中/底部弹出内容面板）

**理由:** 按钮在页面顶部积分卡片中，内联展开无法保证可见性。Modal 与按钮位置无关，点击即可见。同时 "查看明细" 暗示独立视图，Modal 语义更合适。

**替代方案:**
- 把面板移到按钮下方 → 积分卡片会被撑开过长，破坏顶部布局
- scrollIntoView → 页面跳动体验差

### 2. 内联组件而非独立文件

**选择:** 在 `my-profile/page.tsx` 内定义 Modal 组件（文件已 1600+ 行，但 Modal 逻辑简单，仅 ~60 行）

**理由:** 该 Modal 仅在此页面使用，复用 `creditTxs` state 和现有类型定义，无需跨文件传递。保持变更最小化。

**替代方案:**
- 抽取到 `components/credits/CreditHistoryModal.tsx` → 需要 props 传递 + 额外文件，过度抽象

### 3. 全量加载交易记录

**选择:** API 移除 `limit(10)` → 改为 `limit(200)`（设安全上限），前端 Modal 内 `overflow-y-auto` 滚动

**理由:** 普通用户积分交易不会超过几十条。200 条上限足够安全，避免极端情况返回过多数据。

### 4. Modal 样式 — 移动端底部弹出，桌面端居中

**选择:** 移动端 `fixed bottom-0 inset-x-0 max-h-[70vh]` 底部半屏；桌面端 `fixed inset-0 flex items-center justify-center` 居中卡片 `max-w-md max-h-[70vh]`

**理由:** Mobile-first 设计原则。底部弹出是移动端 Modal 的标准交互模式，手指易触达关闭按钮。

### 5. 类型 badge 映射

**选择:** 根据 `tx.type` 字段映射 badge 颜色和标签：
- `daily_checkin` → 签到（蓝）
- `profile_complete` → 完善资料（绿）
- `referral` → 邀请好友（紫）
- `purchase` → 购买（金）
- `spend` → 消耗（红/橙）
- 其他 → 默认灰

**理由:** 视觉区分来源类型，一目了然。

## Risks / Trade-offs

- **[风险] 大文件继续增长** → 可接受，Modal 仅增加 ~60 行，未来若页面重构再拆分
- **[风险] 200 条限制可能不够** → 极端用户可能超过，但当前产品阶段不会出现。后续可加 "加载更多" 按钮
- **[权衡] 不做独立 API 端点** → 复用现有 `GET /api/user/credits`，仅改 limit 值，最小化变更
