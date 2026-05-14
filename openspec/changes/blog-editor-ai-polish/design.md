## Context

博客编辑器 (`app/dashboard/koala/blog/edit/page.tsx`, 1111 行) 已有完整的 AI 全文生成、插图生成、翻译等功能。AI 辅助操作统一走 `/api/blog/ai-assist` 路由，支持 `recommend_category`、`generate_tags`、`translate`、`cover_prompt` 四种 action。图片上传统一存 Supabase Storage `blog-images` bucket。

现需新增：(1) AI 润色 action，(2) 编辑区字数+平台提示，(3) 封面图本地文件上传。

## Goals / Non-Goals

**Goals:**
- Admin 可对已有正文进行 AI 润色，选择风格/字数/平台三个维度
- 润色结果与原文并排对比，确认后才替换
- 编辑区底部实时显示字数和平台适配建议
- 封面图支持本地文件上传到 Supabase Storage

**Non-Goals:**
- 不做实时协同编辑
- 不做内容版本管理/回滚
- 不改变现有 AI 全文生成功能
- 不做左右分栏实时预览（现有预览模式已足够）

## Decisions

### 1. AI 润色复用 ai-assist 路由

在 `/api/blog/ai-assist` 新增 `action: 'polish'`，而不是创建独立路由。

**理由：** 现有 ai-assist 已有 4 种 action，统一入口便于维护。润色是同类操作（输入内容 → AI 处理 → 返回结果），不需要独立路由。

**替代方案：** 独立 `/api/blog/polish` 路由 — 增加路由数量，无实际收益。

### 2. 润色用 Claude Sonnet（非 Haiku）

润色涉及风格改写和字数控制，对语言质量要求高。

**理由：** 现有 ai-assist 的 category/tags/translate 用 Haiku 是因为任务简单。润色是创意写作任务，Sonnet 输出质量显著更好。成本可控（单次调用 ~$0.01）。

### 3. 润色面板作为 Modal 弹窗

点击"AI 润色"按钮弹出全屏 Modal，包含设置选项 + 原文/润色对比。

**理由：** 编辑页已很复杂（1100+ 行），在现有布局中加面板会过于拥挤。Modal 提供专注的润色空间，对比视图需要足够宽度。

### 4. 字数统计纯前端计算

在 textarea 的 onChange 中实时计算字数（中文按字符计、英文按空格分词），不走 API。

**理由：** 纯展示功能，无需服务端。实时性要求高（每次输入都更新），API 调用会造成延迟和浪费。

### 5. 封面图上传走独立 API

新增 `POST /api/blog/upload-cover`，接收 multipart/form-data，上传到 Supabase Storage 返回 public URL。

**理由：** 现有 ai-assist 路由处理 JSON body，混入文件上传会让接口职责不清。Supabase Storage 上传需要 service_role_key，必须走服务端。

## Risks / Trade-offs

- **[润色质量不稳定]** → 提供风格示例在 prompt 中，限定输出格式。用户可多次重试。
- **[大文章润色慢]** → 限制输入 content 最多 5000 字符给 AI。超长文章提示"建议分段润色"。
- **[字数控制不精确]** → AI 难以精确控制输出字数。prompt 中给目标范围（如"800±100字"），而非精确值。
- **[文件上传大小]** → 限制 5MB，仅接受 image/* MIME type。前端和后端双重校验。
