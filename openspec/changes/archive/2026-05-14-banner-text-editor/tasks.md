## 1. 数据库 + API

- [x] 1.1 DB: 添加 overlay_config JSONB 列
- [x] 1.2 API route.ts: create 支持 overlay_config
- [x] 1.3 API [id]/route.ts: update 支持 overlay_config

## 2. Admin 编辑器 UI

- [x] 2.1 替换 overlay_title/subtitle 输入框为多图层编辑器组件
- [x] 2.2 图层控制面板（文字、大小、粗细、颜色、方向、删除）
- [x] 2.3 实时预览区域 + 拖拽定位（Pointer Events 支持鼠标+触摸）
- [x] 2.4 编辑表单也使用相同编辑器

## 3. 前端渲染

- [x] 3.1 BannerCarousel 渲染 overlay_config 图层（兼容旧 overlay_title）

## 4. 验证

- [x] 4.1 npm run build
