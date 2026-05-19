## Why

邀请海报"保存海报"按钮在移动端和 in-app 浏览器（如微信）中点击后报错"截图失败，请手动复制链接"。根因是旧代码使用 `html2canvas` 做客户端截图，该库在跨域图片、WebView 环境下不稳定。main 分支已有 `/api/invite-poster` 的 sharp 服务端渲染方案，但部署版本仍运行旧的 html2canvas 代码（worktree `reverent-shirley-d2e89a` 中的版本）。

## What Changes

- 确认 `SharePoster.tsx` 使用 `/api/invite-poster` 服务端渲染方案（已在 main 上），移除对 `html2canvas` 的依赖
- 修复移动端下载兼容性：blob URL + `window.open` 可能被 in-app 浏览器拦截，需增加 fallback 策略
- 验证 `/api/invite-poster` API 在 Vercel 部署环境下 sharp 能正常运行
- 清理旧的 `/api/og/invite` 路由（已被 `/api/invite-poster` 替代）

## Capabilities

### New Capabilities

_(无 — 这是 bug 修复，不引入新能力)_

### Modified Capabilities

_(无 — 不涉及现有 spec 级别的需求变更)_

## Impact

- **前端**: `app/components/SharePoster.tsx` — 保存逻辑
- **调用方**: `app/koala/my-profile/page.tsx` — 传入 props 不变
- **API**: `/api/invite-poster/route.ts` — 已有，无需改动
- **可清理**: `/api/og/invite/route.tsx` — 旧方案，可删除
- **依赖**: 可移除 `html2canvas`（如果只有此处使用）
