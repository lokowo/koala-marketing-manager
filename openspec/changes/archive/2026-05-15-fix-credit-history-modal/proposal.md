## Why

用户在「我的」页面点击「查看积分明细 →」按钮后无可见响应。根本原因：按钮在页面顶部积分卡片中（line ~1018），但展开面板渲染在页面底部右栏深处（line ~1568），用户看不到变化。需要改为 Modal 弹窗，点击即弹出，体验清晰直接。

## What Changes

- 移除 `my-profile/page.tsx` 中现有的内联积分明细展开面板（line ~1568 的 `{showCreditsDetail && ...}` 块）
- 新增 `CreditHistoryModal` 组件，点击「查看积分明细 →」后弹出全屏/半屏 Modal
- Modal 内容：按时间倒序展示所有积分变动记录
  - 时间（YYYY-MM-DD HH:mm）
  - 来源类型 badge（签到、完善资料、邀请好友、购买积分包、AI消耗 等）
  - 描述文字
  - 变动数值（正数绿色 +N，负数红色 -N）
  - 变动后余额
- 复用现有 `GET /api/user/credits` 接口（已返回 `credit_transactions` 数据），移除 `limit(10)` 限制或增加分页
- 无需新建数据库表（`credit_transactions` 已存在，含 `amount`、`balance_after`、`type`、`description`、`created_at` 字段）

## Capabilities

### New Capabilities
- `credit-history-modal`: 积分明细 Modal 弹窗组件，展示用户完整积分变动历史

### Modified Capabilities
_无需修改现有 spec 的需求定义。_

## Impact

- **前端**: `app/koala/my-profile/page.tsx` — 修改按钮 onClick 行为，移除内联面板，添加 Modal
- **API**: `app/api/user/credits/route.ts` — 可能需要移除 `limit(10)` 或增加分页参数以支持完整历史
- **数据库**: 无变更（`credit_transactions` 表已存在且字段齐全）
- **依赖**: 无新依赖
