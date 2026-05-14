## Why

用户目前只能通过复制文字邀请好友，缺少可视化的分享海报（含二维码），且注册 API 不区分普通用户邀请 vs Sales 推广 vs Admin 邀请三种渠道，导致 Sales KPI 无法归因、Admin 邀请受 3 人限制。需要补齐海报分享能力并统一注册时的邀请码处理逻辑。

## What Changes

### 新增
- **分享海报 API**（`/api/share/poster`）：返回用户专属邀请码、二维码 URL、剩余邀请次数
- **分享海报组件**（`SharePoster.tsx`）：可视化海报，含品牌信息 + 专属二维码 + 邀请码，支持 html2canvas 截图保存到相册
- **个人中心"邀请好友"入口**：点击弹出海报弹窗，替代现有的纯文字复制

### 修改
- **注册 API 邀请码处理逻辑**（`/api/auth/register`）：
  - 先查 `user_profiles.referral_code` → 普通用户/Admin 邀请
  - 再查 `sales_qrcodes.code` → Sales 渠道
  - 普通用户：检查 `referral_codes.uses < max_uses(3)`，双方加积分
  - Sales：无次数限制，写入 `sales_customers` + 更新 KPI 计数
  - Admin（`role = admin`）：无次数限制，不计 KPI，双方加积分

## Capabilities

### New Capabilities
- `share-poster`: 分享海报生成与展示，包含 API 端点、前端海报组件、html2canvas 截图保存

### Modified Capabilities
- `registration-referral`: 注册时邀请码处理逻辑，区分普通用户/Sales/Admin 三种渠道，各自不同的限制和副作用

## Impact

- **API**: `/api/auth/register/route.ts` 逻辑重构（邀请码处理部分），新增 `/api/share/poster/route.ts`
- **组件**: 新增 `SharePoster.tsx`，修改 `my-profile` 页面（加入海报入口）
- **数据库**: 依赖已有的 `sales_qrcodes`、`sales_customers` 表（已在代码中引用，需确认表存在）
- **依赖**: `html2canvas` 已安装，`qrcode` 已安装，无新依赖
