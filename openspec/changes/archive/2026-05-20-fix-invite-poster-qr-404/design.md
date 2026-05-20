## Context

邀请海报在 `app/api/invite-poster/route.tsx:58` 生成 QR 码时硬编码了 `https://www.koalaphd.com/koala/register?ref=${code}`。注册页实际路径为 `/koala/auth`，已支持 `?ref=` 参数（line 38）。

## Goals / Non-Goals

**Goals:**
- 新海报 QR 码指向正确的 `/koala/auth?ref=XXX`
- 旧海报（已生成、已保存、已分享）扫码不再 404

**Non-Goals:**
- 重新设计注册页
- 修改注册逻辑

## Decisions

### 1. 双管齐下：修 URL + 加重定向
- 修 QR URL：新生成的海报直接指向 `/koala/auth`
- 加重定向：`/koala/register` 做 Next.js redirect 到 `/koala/auth`，保留所有 query params
- **理由**: 已分享的海报图片中 QR 码无法回溯修改

### 2. 重定向方式：Next.js redirect() 在 page.tsx 中
- 用 server component 的 `redirect()` 做 308 永久重定向
- **替代方案**: next.config 的 redirects 配置 — 但 query params 透传需要额外配置，page.tsx 更直观

## Risks / Trade-offs

- **[QR 码缓存]** → invite-poster route 设置了 `Cache-Control: public, max-age=3600`，修改后最多 1 小时旧 URL 才会更新。但重定向路由兜底，所以无影响。
