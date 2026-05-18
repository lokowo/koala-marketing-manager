## Why

RAG 读取链路（embedding 生成 → pgvector 搜索 → AI chat 注入）已经完整建好，但缺少运行时的知识管理能力。目前只能通过跑脚本（`seed-knowledge-base.ts`、`build-knowledge.ts`）来填充 `knowledge_chunks` 表，Admin 无法在后台增删改查知识条目、上传文档、或触发 embedding 重建。这使得知识库内容更新依赖开发者手动操作，无法支撑持续运营。

## What Changes

- 新增知识条目 CRUD API（创建、更新、删除、列表查询）
- 创建时自动生成 OpenAI embedding 并存入 pgvector
- 更新内容时自动重新生成 embedding
- 支持批量导入（JSON 格式）
- Admin 后台知识库管理页面增加完整的增删改查功能（现有页面 `dashboard/koala/knowledge-base/page.tsx` 只有只读展示）
- 新增 RAG 搜索测试接口，Admin 可输入查询文本查看检索结果和相似度分数

## Capabilities

### New Capabilities
- `knowledge-crud`: 知识条目的创建、读取、更新、删除 API 及 Admin UI，包括自动 embedding 生成
- `knowledge-search-api`: 独立的语义搜索 API，供 Admin 测试和调试 RAG 检索效果

### Modified Capabilities
（无需修改现有 spec，读取链路 `rag-engine.ts` → `ai/chat` 不变）

## Impact

- **新增 API**: `app/api/admin/knowledge/route.ts`（GET 列表 + POST 创建）、`app/api/admin/knowledge/[id]/route.ts`（GET 详情 + PUT 更新 + DELETE 删除）、`app/api/admin/knowledge/search/route.ts`（POST 语义搜索测试）
- **修改页面**: `app/dashboard/koala/knowledge-base/page.tsx` — 从只读展示升级为完整 CRUD 管理界面
- **依赖**: OpenAI embedding API（`app/lib/server/embedding.ts` 已有，直接复用）
- **数据库**: 使用现有 `knowledge_chunks` 表，不新建表
- **权限**: 所有接口仅限 Admin 角色访问
