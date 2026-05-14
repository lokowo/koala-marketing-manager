## Why

教授详情页（`/koala/professors/[id]`）目前只有结构化数据（研究方向 tags、论文列表、H指数数字），没有任何自然语言介绍，页面下半部分空荡。用户打开页面很难快速判断"这位教授适不适合我"。需要增加 AI 生成的中文简介、关联博客文章、同方向教授推荐来填充内容，提升页面价值和停留时间。

## What Changes

### 1. AI 教授简介
- 新增 API `GET /api/professors/[id]/ai-summary`：用 Claude Haiku 生成 2-3 句中文简介（研究领域、学术亮点、PhD 价值）
- 生成结果缓存到 professors 表新字段 `ai_summary`，不重复调用
- 详情页新增"教授简介"卡片，展示 AI 简介 + "AI 生成" 标注

### 2. 关联博客文章
- 详情页 server component 查询 `blog_posts WHERE (title ILIKE '%教授名%' OR tags @> '{教授名}') AND status = 'published'`
- 匹配到时显示文章链接卡片（封面缩略图 + 标题 + 分类）

### 3. 同方向教授推荐
- 详情页 server component 查询 `professors WHERE research_areas && 当前教授.research_areas AND id != 当前教授.id LIMIT 3`
- 显示 2-3 个推荐教授小卡片（头像、名字、学校、匹配的研究方向 tag）

### 4. 申请建议（静态模板）
- 根据教授的 grant_status、accepting_students、research_areas 生成简短申请建议
- 不调用 AI，用模板逻辑拼接（"该教授目前有活跃经费，建议重点关注..."）

## Capabilities

### New Capabilities
- `professor-ai-summary`: AI 教授简介生成、缓存、展示
- `professor-detail-content`: 关联博客、同方向推荐、申请建议模板

### Modified Capabilities

## Impact

- **数据库**: professors 表新增 `ai_summary TEXT` 字段（Supabase migration）
- **API**: 新增 `GET /api/professors/[id]/ai-summary`
- **前端**: `ProfessorDetailClient.tsx` 新增 4 个内容区块；`page.tsx` 新增关联博客和推荐教授的 server-side 查询
- **成本**: Haiku 生成一次 ~0.001 USD/教授，缓存后不重复
- **依赖**: 无新依赖
