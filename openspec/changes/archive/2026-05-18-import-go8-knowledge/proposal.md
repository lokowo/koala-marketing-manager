## Why

需要将 13 条 Go8 大学知识数据导入 `knowledge_chunks` 表，包括 8 所大学 PhD 申请指南、奖学金对比、套磁信指南、签证指南、CSC 指南、平台介绍。源 JSON 文件有语法错误（未转义的引号），改为将数据直接嵌入 API route 中。

## What Changes

- 创建一次性导入 API route `POST /api/admin/knowledge/import-go8`
- 数据包含 title、content、category、tags，自动生成 embedding 后存入 `knowledge_chunks`
- Admin 调用一次完成导入

## Capabilities

### New Capabilities
（无，属于数据填充操作）

### Modified Capabilities

## Impact

- **新增**: `app/api/admin/knowledge/import-go8/route.ts`
- **依赖**: OpenAI embedding API
