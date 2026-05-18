## Context

教授库有 24,495 条记录，分类过滤通过 `search_professors_v2` RPC 实现，使用 `CATEGORY_KEYWORDS` 映射表将分类名（如 `bio`）转换为关键词数组，然后在 SQL 中用 ILIKE 子串匹配 `research_areas`。

当前问题：
- ILIKE `%RNA%` 匹配了 "Maternal"、"International" 等词，导致 1,086 个误分类（bio 分类的 75% 匹配为误报）
- 前端用 8 个并行请求获取分类计数，每个触发全表扫描，在生产环境超时导致计数显示为 0
- 主数据查询的 total 与分类计数使用相同 RPC 但不同调用路径，失败模式不一致

## Goals / Non-Goals

**Goals:**
- 消除短关键词（RNA/DNA/HIV）的 ILIKE 子串误匹配
- 用单次查询替代 8 次并行请求获取分类计数
- 确保分类计数与列表 total 一致

**Non-Goals:**
- 不重构整个分类体系（如引入 ML 自动分类）
- 不新增 `category` 预计算列（当前 keyword 动态匹配足够）
- 不调整 CATEGORY_KEYWORDS 词表内容（仅修复匹配方式）

## Decisions

### Decision 1: 用 `~*` 正则替代 ILIKE 进行关键词匹配

**选择**: 将 RPC 中的 `ILIKE '%' || kw || '%'` 改为 `~* ('\m' || kw || '\M')`

**替代方案**:
- A) 用 `= ANY(research_areas)` 精确匹配数组元素 → 不可行，keyword 通常是 research area 的子串（如 "Machine Learning" 在 "Machine Learning and Optimization" 中）
- B) 对短关键词加前后空格/标点检测 → 太 hacky，不如正则通用
- C) 预计算 `category` 列 → 需要维护同步逻辑，当前数据规模不需要

**理由**: `\m` 和 `\M` 是 PostgreSQL 的词边界锚点，等价于其他正则引擎的 `\b`，能精确区分 "RNA" 作为独立词还是子串。

### Decision 2: 新建 `/api/professors/counts` 端点

**选择**: 创建一个专用 RPC `get_professor_category_counts`，在单次 SQL 中使用 `COUNT(*) FILTER (WHERE ...)` 对所有分类并行计数。

**替代方案**:
- A) 在现有 `search_professors_v2` 中加 `counts_only` 参数 → 职责混合，且现有 RPC 已够复杂
- B) 保持 8 次并行请求但加缓存 → 没有解决根本问题，只是掩盖延迟

**理由**: 单次扫描 + 8 个 FILTER 比 8 次独立全表扫描高效 8 倍。

### Decision 3: 同步修改 RPC 和 counts，使用相同匹配逻辑

两处匹配逻辑（列表过滤 + 计数）必须使用完全相同的正则表达式，避免计数与列表 total 不一致。具体做法：在 counts RPC 中直接引用相同的关键词数组和匹配方式。

## Risks / Trade-offs

- **[性能] 正则比 ILIKE 慢** → 实测 `~*` 在 24K 行上的差异 <50ms，可忽略。如果未来数据量增大，再考虑预计算列或 GIN 索引。
- **[行为变更] bio 分类结果减少约 20%** → 这是预期的去误报效果，用户看到的结果更精准。
- **[部署顺序] RPC 修改需要先于前端部署** → 先部署 DB migration（RPC 更新），再部署前端。如果顺序反了，新前端调旧 counts RPC 会 404，但有 catch fallback。
