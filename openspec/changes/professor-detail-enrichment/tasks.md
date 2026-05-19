## 1. 数据库

- [x] 1.1 professors 表新增 `ai_summary TEXT` 字段（通过 Supabase MCP 执行 ALTER TABLE）
- [x] 1.2 更新 `app/lib/database.types.ts` 添加 `ai_summary` 字段
- [x] 1.3 更新 `app/lib/types.ts` Professor 接口添加 `aiSummary`
- [x] 1.4 更新 `app/lib/services/professorService.ts` fromRow 映射 `ai_summary`

## 2. AI 简介 API

- [x] 2.1 创建 `app/api/professors/[id]/ai-summary/route.ts` — GET 端点，检查缓存，无则调 Haiku 生成并写回 DB
- [x] 2.2 接入 aiLimiter 限流

## 3. 详情页 server-side 数据

- [x] 3.1 `page.tsx` 新增关联博客查询：`blog_posts WHERE title ILIKE '%name%' AND status = 'published' LIMIT 3`
- [x] 3.2 `page.tsx` 新增同方向教授查询：`professors WHERE research_areas && areas AND id != currentId ORDER BY opportunity_score DESC LIMIT 3`

## 4. 详情页 UI

- [x] 4.1 AI 简介区块：头像卡片下方，显示 aiSummary 或触发加载 + "AI 生成"标注
- [x] 4.2 申请建议区块：Opportunity Signal 下方，模板拼接逻辑
- [x] 4.3 关联博客区块：论文列表下方，文章标题链接 + 分类 badge
- [x] 4.4 同方向教授推荐区块：CTA 按钮下方，2-3 个教授小卡片，可点击跳转

## 5. 验证

- [x] 5.1 `npm run build` 通过
