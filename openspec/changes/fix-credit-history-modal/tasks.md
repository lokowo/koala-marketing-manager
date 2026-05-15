## 1. API 调整

- [x] 1.1 将 `app/api/user/credits/route.ts` 中 `credit_transactions` 查询的 `.limit(10)` 改为 `.limit(200)`

## 2. Modal 组件实现

- [x] 2.1 在 `app/koala/my-profile/page.tsx` 中新增 `showCreditModal` state（复用或替换现有 `showCreditsDetail`）
- [x] 2.2 实现 CreditHistoryModal 内联组件：fixed 定位遮罩 + 内容面板
- [x] 2.3 实现响应式布局：移动端底部弹出（bottom-0, max-h-[70vh]），桌面端居中（items-center justify-center, max-w-md）
- [x] 2.4 实现 Modal header：标题「💰 积分明细」+ 关闭按钮
- [x] 2.5 实现交易列表：时间（YYYY-MM-DD HH:mm）、类型 badge、描述、金额（绿+/红-）、变动后余额
- [x] 2.6 实现类型 badge 颜色映射（daily_checkin→蓝, profile_complete→绿, referral→紫, purchase→金, spend→橙, 其他→灰）
- [x] 2.7 实现空状态「暂无积分记录」
- [x] 2.8 实现深浅色主题适配（dark: 前缀）

## 3. 接线与清理

- [x] 3.1 修改「查看积分明细 →」按钮的 onClick 为打开 Modal
- [x] 3.2 点击遮罩关闭 Modal
- [x] 3.3 移除原有内联展开面板（line ~1568 的 `{showCreditsDetail && ...}` 块）
- [x] 3.4 清理不再使用的 `showCreditsDetail` state（如已被 `showCreditModal` 替换）

## 4. 验证

- [x] 4.1 `npm run build` 编译通过
- [ ] 4.2 手动验证：点击按钮 → Modal 弹出 → 显示交易记录 → 点击关闭/遮罩 → Modal 关闭
