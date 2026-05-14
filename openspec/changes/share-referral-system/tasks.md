## 1. 海报 API

- [x] 1.1 创建 `app/api/share/poster/route.ts` — GET 返回 `{ referralCode, referralUrl, remainingInvites, displayName }`，需认证
- [x] 1.2 Admin 用户返回 `remainingInvites: -1`（无限制标记）

## 2. 海报组件

- [x] 2.1 创建 `app/components/SharePoster.tsx` — 渲染品牌海报：用户名、二维码（qrcode 包）、邀请码文字、剩余次数、Koala PhD 品牌 footer
- [x] 2.2 实现 html2canvas 截图保存功能，失败时 fallback 到复制链接按钮 + toast 提示
- [x] 2.3 邀请次数用完时显示"邀请名额已用完"并禁用保存按钮（Admin 除外）

## 3. 个人中心入口

- [x] 3.1 在 `app/koala/my-profile/page.tsx` 的邀请区域添加"邀请好友"按钮，点击弹出海报 modal
- [x] 3.2 替换或增强现有的纯文字复制区域，保留复制邀请码/链接作为 fallback

## 4. 注册 API 邀请码逻辑重构

- [x] 4.1 提取 `processReferralCode()` 函数，从 register route handler 中分离邀请码处理逻辑
- [x] 4.2 实现三级匹配：先查 `user_profiles.referral_code`，区分 admin/普通用户
- [x] 4.3 普通用户：检查 `uses < max_uses`，通过则双方加积分（邀请者 +15，被邀请者 +5）
- [x] 4.4 Admin 用户：跳过 max_uses 检查，双方加积分，不写 KPI
- [x] 4.5 Sales 渠道：匹配 `sales_qrcodes.code`，写入 `sales_customers`，更新 `register_count`，被邀请者 +5
- [x] 4.6 全部 try-catch 包裹，失败不阻塞注册

## 5. 验证

- [x] 5.1 `npm run build` 通过
- [ ] 5.2 手动测试海报渲染 + 截图保存
- [ ] 5.3 测试注册流程：普通邀请码、Admin 邀请码、Sales 码、无效码四种场景
