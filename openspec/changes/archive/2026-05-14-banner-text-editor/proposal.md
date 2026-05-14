## Why

当前 Banner 覆盖文字只支持简单的标题+副标题，无法控制字体大小、颜色、位置和方向。需要升级为多图层文字编辑器，每行文字独立控制，支持拖拽定位和竖排文字。

## What Changes

- DB: 新增 `overlay_config` JSONB 列替代 `overlay_title`/`overlay_subtitle`
- Admin UI: 多图层文字编辑器（图层列表 + 实时预览 + 拖拽定位）
- 每个图层控制：文字内容、字体大小、粗细、颜色、方向（横/竖排）、位置
- BannerCarousel 前端渲染 overlay_config 中的图层数据
- 向后兼容：保留旧 overlay_title/overlay_subtitle 字段作为 fallback

## Capabilities

### New Capabilities
（无新 capability — 后台功能增强）

### Modified Capabilities
（无 spec 级别变更）

## Impact

- `app/dashboard/koala/banners/page.tsx` — 编辑器 UI 大幅改动
- `app/components/BannerCarousel.tsx` — 渲染逻辑更新
- `app/api/admin/banners/route.ts` + `[id]/route.ts` — API 字段更新
- DB: banners 表新增 overlay_config JSONB
