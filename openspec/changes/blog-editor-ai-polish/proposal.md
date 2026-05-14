## Why

博客编辑器已有完整的 AI 全文生成、插图生成、翻译等功能，但缺少对**已有内容的 AI 润色**能力。Admin 经常需要将原始素材（会议笔记、采访记录、粗稿）润色为不同风格的成品文章，目前只能手动编辑或重新生成整篇。同时编辑区没有字数反馈，Admin 无法快速判断内容是否适合目标发布平台。

## What Changes

- 新增 AI 润色功能：Admin 可对正文内容一键润色，选择语言风格（新闻报道/社交媒体/学术科普/轻松对话）、目标字数（500/800/1200/2000/不限）、目标平台（微信公众号/小红书/博客网站/LinkedIn），润色后对比原文确认替换
- 编辑区底部新增实时字数统计 + 平台适配提示（<300字 适合小红书、300-800字 适合公众号、800-2000字 适合博客、>2000字 建议精简）
- 封面图区域新增本地文件直接上传（当前只能粘贴 URL 或 AI 生成）

## Capabilities

### New Capabilities
- `ai-content-polish`: AI 内容润色 — 接收原文 + 风格/字数/平台参数，返回润色后内容，支持原文对比和确认替换
- `editor-word-count`: 编辑区实时字数统计与平台适配提示

### Modified Capabilities
<!-- 无需修改现有 spec -->

## Impact

- **新增 API**: `POST /api/blog/ai-assist` 增加 `polish` action（复用现有 ai-assist 路由）
- **修改文件**: `app/dashboard/koala/blog/edit/page.tsx` — 新增润色面板 UI + 字数提示 + 封面图上传
- **新增 API**: `POST /api/blog/upload-cover` — 接收文件上传到 Supabase Storage
- **无新依赖**: 使用现有 Claude Haiku/Sonnet + Supabase Storage
- **无数据库变更**: 不需要新增表或字段
