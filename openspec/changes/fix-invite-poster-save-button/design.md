## Context

`SharePoster.tsx` 在生产环境使用 `html2canvas` 客户端截图生成邀请海报图片，在移动端 WebView（微信、支付宝等 in-app 浏览器）中频繁失败。main 分支已有 `/api/invite-poster` 路由使用 sharp + SVG 模板 + QR code 在服务端渲染 PNG，但前端组件在部分代码路径仍可能走旧逻辑。

当前文件：
- `app/components/SharePoster.tsx` — main 分支已改为 fetch `/api/invite-poster`
- `app/api/invite-poster/route.ts` — sharp 渲染，已验证返回有效 750×1334 PNG
- `app/api/og/invite/route.tsx` — 旧 next/og ImageResponse 方案，已被替代
- `app/koala/my-profile/page.tsx` — 调用方

## Goals / Non-Goals

**Goals:**
- 保存海报在所有环境下可靠工作（桌面浏览器、移动 Safari、Chrome、微信 WebView）
- 移除 SharePoster 对 html2canvas 的依赖
- 清理废弃的 `/api/og/invite` 路由

**Non-Goals:**
- 不重新设计海报视觉样式（当前 sharp SVG 模板已够用）
- 不移除 html2canvas 包（`ShareBar.tsx` 仍在使用）
- 不改变 `/api/invite-poster` 的渲染逻辑

## Decisions

**1. 服务端渲染 vs 客户端截图**
选择：服务端渲染（sharp）。理由：不依赖浏览器 Canvas API，不受 CORS / WebView 限制，输出一致。

**2. 移动端下载策略**
选择：fetch blob → `<a download>` 为主，`window.open(blobUrl)` 为 fallback。如果两者都失败（in-app 浏览器），展示图片让用户长按保存。理由：覆盖最多浏览器环境。

**3. 删除 /api/og/invite**
选择：删除。理由：已被 `/api/invite-poster`（sharp 方案）完全替代，保留会造成混淆。

## Risks / Trade-offs

- [Risk] sharp 在 Vercel Serverless 环境中包体较大 → sharp 已在 package.json 中，Vercel 原生支持，无额外风险
- [Risk] 微信内置浏览器拦截 blob URL 下载 → Mitigation: 图片已在页面上展示，toast 提示"长按图片保存到相册"
