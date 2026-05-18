## Context

教授详情页当前只有结构化数据卡片，缺少自然语言内容。页面约 294 行，分为左右两栏（desktop）。需要在不破坏现有布局的前提下插入 4 个新内容区块。

professors 表目前没有 `ai_summary` 字段。blog_posts 表有 `title`、`content`、`tags[]`、`cover_image`、`slug` 可用于关联查询。

## Goals / Non-Goals

**Goals:**
- 用户打开详情页能在 2 秒内理解"这位教授做什么、适不适合我"
- AI 简介只生成一次，后续直接读缓存
- 关联博客和推荐教授在 server side 完成，不增加客户端请求

**Non-Goals:**
- 不做 AI 简介的批量预生成（按需生成，用户访问时触发）
- 不做申请建议的 AI 生成（模板拼接即可，节省成本）
- 不修改教授列表页

## Decisions

### 1. AI 简介生成策略：按需 + 缓存

用户访问详情页时，client 检查 professor 对象是否已有 `aiSummary`。如果没有，调用 `GET /api/professors/[id]/ai-summary`，API 内部用 Haiku 生成并写回 `professors.ai_summary`。下次访问直接从 DB 读取。

不做批量预生成的原因：教授有 500+，批量调 Haiku 虽然便宜但没必要——很多教授可能从未被访问。

### 2. 关联博客：server-side 查询

在 `page.tsx`（server component）中直接查 blog_posts，结果传给 client。查询条件：
```sql
title ILIKE '%教授名%' AND status = 'published'
```
不查 content ILIKE（太慢，全文扫描），tags 数组匹配作为补充。

### 3. 同方向教授：数组重叠查询

```sql
SELECT * FROM professors 
WHERE research_areas && $currentAreas 
AND id != $currentId 
ORDER BY opportunity_score DESC NULLS LAST
LIMIT 3
```

Supabase 支持 `overlaps` 操作符用于数组交集。

### 4. 申请建议：纯模板

根据 `grant_status`、`accepting_students`、`hIndex` 三个维度拼接 2-3 句建议文案。不调 AI。

### 5. 布局位置

```
左栏:
  头像卡片
  ★ AI 简介（新）          ← 紧跟头像，让用户第一时间读到
  Opportunity Signal
  ★ 申请建议（新）          ← 紧跟 Opportunity，上下文连贯
  研究方向
  适合背景
  学术数据

右栏:
  联系方式
  论文列表
  ★ 关联博客（新）          ← 论文列表后，内容相关
  数据免责
  CTA 按钮
  ★ 同方向教授推荐（新）    ← 最底部，引导继续浏览
```

## Risks / Trade-offs

- **[风险] Haiku 生成失败** → API 返回空，前端显示 loading 态或隐藏该区块，不影响页面其他内容
- **[风险] 关联博客查询慢** → title ILIKE 有索引支持，且 blog_posts 表数据量小（<200），不是问题
- **[权衡] 不查 content ILIKE** → 可能漏掉一些提到教授但标题没写的文章，但避免全文扫描性能问题
