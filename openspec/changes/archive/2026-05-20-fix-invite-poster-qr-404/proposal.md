## Why

邀请海报 QR 码编码 URL 为 `/koala/register?ref=XXX`，但该路由不存在。实际注册页在 `/koala/auth`。扫码后 404。已生成的海报图片中 QR 码无法修改，必须同时创建重定向路由兜底。

## What Changes

- 修改 `app/api/invite-poster/route.tsx` 中 QR 码 URL 从 `/koala/register` 改为 `/koala/auth`
- 创建 `/koala/register` 重定向路由，将所有请求 301 到 `/koala/auth`（保留 query params），兜底已生成的旧海报

## Capabilities

### New Capabilities
- `invite-qr-redirect`: `/koala/register` → `/koala/auth` 永久重定向（保留 query params）

### Modified Capabilities

## Impact

- **文件**: `app/api/invite-poster/route.tsx`（QR URL 修正）、`app/koala/register/page.tsx`（新建重定向页）
- **风险**: 极低——纯路由修正，不涉及业务逻辑
