## Context

Koala PhD 已有完整的邀请码体系：注册时生成 6 位码、邀请者 +15 积分、被邀请者 +5、上限 3 人。个人中心有复制邀请码/文案的功能。但缺少可视化分享海报，且注册 API 不区分普通用户/Sales/Admin 三种邀请来源。

现有数据库表：`user_profiles`（含 `referral_code`, `referred_by`, `role`）、`referral_codes`（含 `uses`, `max_uses`）、`sales_qrcodes`（含 `code`）、`sales_customers`。

## Goals / Non-Goals

**Goals:**
- 用户可生成含二维码的分享海报，截图保存到相册发送
- 注册 API 按优先级匹配邀请码来源：普通用户 → Sales → 失败
- Admin 邀请无次数限制，不写 KPI
- Sales 邀请无次数限制，写入 `sales_customers` + 更新扫码/注册计数

**Non-Goals:**
- 不做邀请码过期机制
- 不做邀请排行榜/社交功能
- 不改 Sales 后台的推广码管理（已有）
- 不做服务端海报渲染（用前端 html2canvas）

## Decisions

### 1. 海报渲染：前端 html2canvas vs 服务端 Canvas

**选择：前端 html2canvas**

理由：已安装 html2canvas，无需服务端 sharp/canvas 依赖，用户在手机上直接截图保存更自然。海报内容是静态的（头像+码+二维码+品牌），不需要服务端渲染。

### 2. 二维码生成：前端 qrcode vs API 返回图片 URL

**选择：API 返回注册链接，前端用已安装的 `qrcode` 包生成二维码 canvas**

理由：`qrcode` 已安装，前端生成避免额外网络请求。API 只需返回邀请码和剩余次数。

### 3. 注册邀请码匹配顺序

**选择：先查 `user_profiles.referral_code`（普通用户/Admin），再查 `sales_qrcodes.code`（Sales）**

理由：普通用户邀请是主要场景，Sales 推广码通常通过 `salesCode` 参数单独传入。两者不互斥但需要优先级：如果同一个码既是用户码又是 Sales 码（不太可能但要防御），优先按用户邀请处理。

### 4. Admin 无限制邀请

**选择：检查 referrer 的 `role` 字段，admin 跳过 `uses < max_uses` 检查**

理由：Admin 是运营人员，需要灵活邀请，但不应占用 Sales KPI。直接复用现有 `role` 字段判断，无需新增表或字段。

## Risks / Trade-offs

- **html2canvas 在部分低端安卓 WebView 中截图可能失败** → 提供 fallback：复制邀请链接按钮始终可用
- **`sales_qrcodes` 表可能未建** → 代码中已有引用（`/api/sales/qrcode`），如果表不存在则跳过 Sales 分支，不影响普通邀请流程
- **注册 API 逻辑变复杂** → 提取为独立函数 `processReferralCode()`，保持 route handler 简洁
