## Why

知识库有 3644 条数据，所有 embedding 均已存在（非 NULL），但 Admin 语义搜索测试返回空结果。诊断发现两个问题：
1. 默认相似度阈值 0.7 过高 — 实际语料中语义相似内容的 cosine similarity 在 0.5-0.6 之间，0.7 只能匹配到完全相同的文档
2. UI 吞掉了 API 错误 — 如果 OpenAI embedding 生成失败，UI 显示空结果无任何错误提示

此外需要一个 backfill API 用于 Admin 手动触发重建索引（应对将来 embedding 缺失的情况）。

## What Changes

- 将搜索默认阈值从 0.7 降低到 0.45（覆盖更多语义相关内容）
- 同步修改 `rag-engine.ts` 的 `searchKnowledgeBase` 阈值从 0.7 → 0.45
- Admin UI 搜索面板显示 API 错误信息（不再静默吞掉）
- 新增 `/api/admin/knowledge/backfill` POST 端点 — Admin 可触发缺失 embedding 的补全
- Admin 知识库页面添加"重建索引"按钮

## Capabilities

### New Capabilities
（无新 capability）

### Modified Capabilities
- `knowledge-search-api`: 降低默认阈值，改善搜索召回率
- `knowledge-crud`: UI 增加错误展示和重建索引按钮

## Impact

- **修改**: `app/api/admin/knowledge/search/route.ts` — 阈值 0.7 → 0.45
- **修改**: `app/lib/server/rag-engine.ts` — 阈值 0.7 → 0.45
- **修改**: `app/dashboard/koala/knowledge-base/page.tsx` — 错误展示 + 重建索引按钮
- **新增**: `app/api/admin/knowledge/backfill/route.ts` — embedding 补全端点
