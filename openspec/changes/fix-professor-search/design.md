## Context

教授库搜索有 4 个并发故障：多词搜索失败、结果累加重复、放大镜按钮偶尔无响应、AI 深搜入口行为不一致。

涉及两个文件：
- `app/lib/services/professorService.ts` — 后端搜索逻辑（Supabase 查询 + JS 后处理）
- `app/koala/professors/ProfessorsClient.tsx` — 前端搜索 state machine（debounce、filter useEffect、loadMore、深搜 UI）

## Goals / Non-Goals

**Goals:**
- 修复 4 个搜索 bug，不引入回归
- 保持现有架构不变（局部 patch）

**Non-Goals:**
- 不重构整个搜索 state machine
- 不改分页/无限滚动机制
- 不改 API 接口签名

## Decisions

### D1: 多词搜索 — 单主词查询 + JS AND 过滤

**选择**: 只用第一个搜索词构建 Supabase `.or()` 查询，其余词由已有 JS AND 过滤处理。同时提高 `.limit()` 到 2000。

**备选**: 改用 PostgreSQL `websearch_to_tsquery` 全文检索。
**弃选理由**: 需要建 GIN 索引和 tsvector 列，改动范围远超 bug 修复。

### D2: 竞态重复 — fetchVersion 计数器

**选择**: 用 `useRef` 维护 `fetchVersionRef`，每次 filter 变化时递增。请求完成时对比版本号，过期请求的回调不执行 state 更新。

**备选**: AbortController 取消请求。
**弃选理由**: Supabase client 的 fetch 不方便接入 AbortController；版本号方案更简单且足够。

### D3: 放大镜无响应 — searchTick 强制触发

**选择**: 新增 `searchTick` state，`triggerSearch` 中递增。filter useEffect 的依赖数组加上 `searchTick`，确保即使 `debouncedSearch` 值未变也会重新触发。

**备选**: triggerSearch 中直接内联执行搜索逻辑。
**弃选理由**: 会与现有 useEffect 搜索逻辑重复，维护两套搜索路径。

### D4: 深搜入口 — 统一搜索词来源和交互

**选择**: 所有 3 个深搜入口统一使用 `debouncedSearch`。入口 1（无结果）和入口 2（全网搜索无结果）保持自动调用。入口 3（banner）改为仅在有结果时显示，点击时也自动调用。

## Risks / Trade-offs

- **[limit 2000 性能]** → 多词搜索时 Supabase 返回更多行，增加网络传输。可接受：仅在有搜索词时触发，且 professors 表规模有限（~数千行）。
- **[fetchVersion 不取消请求]** → 过期请求仍然完成网络传输，只是回调被忽略。可接受：搜索频率不高，不会造成明显资源浪费。
