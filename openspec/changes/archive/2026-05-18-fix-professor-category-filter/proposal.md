## Why

教授库分类过滤存在两个严重缺陷：(1) ILIKE 子串匹配导致大量误分类——'RNA' 关键词匹配了 'Maternal'、'International'、'Urinary' 等 1,086 个无关教授（75% 的匹配是误报），使「生命科学」分类膨胀且包含不相关教授；(2) 前端用 8 个并行 API 请求获取分类计数，每个请求触发 24K 行全表扫描，在生产环境容易超时导致计数全部显示为 0。

## What Changes

- **BREAKING**: 修改 `search_professors_v2` RPC 中的分类关键词匹配逻辑，从 ILIKE 子串匹配改为正则词边界匹配（`~*` with `\m...\M`），消除短关键词（RNA/DNA/HIV）的误匹配
- 新增 `/api/professors/counts` 端点，单次查询返回所有分类的计数，替代前端 8 个并行请求
- 前端 `ProfessorsClient.tsx` 改为调用新的 counts 端点获取分类计数

## Capabilities

### New Capabilities
- `professor-category-counts`: 单次批量获取所有分类计数的 API 端点

### Modified Capabilities
- `professor-search`: 修复分类关键词匹配逻辑（ILIKE → 词边界正则），影响 `search_professors_v2` RPC

## Impact

- **数据库**: 修改 `search_professors_v2` RPC 函数中的 category keyword 匹配子句
- **API**: 新增 `app/api/professors/counts/route.ts`
- **前端**: `app/koala/professors/ProfessorsClient.tsx` 中分类计数获取逻辑
- **数据影响**: 「生命科学」分类从 ~5,449 降至 ~4,363（去除 1,086 个 RNA 误匹配），其他分类可能有小幅变动
