## 1. Bug 1 — 多词搜索修复（后端）

- [x] 1.1 修改 `professorService.ts` 多词搜索查询策略：多词时只用第一个词构建 `.or()` 查询，其余词交给已有的 JS AND 过滤
- [x] 1.2 将搜索时的 `.limit(500)` 提高到 `.limit(2000)`

## 2. Bug 2 — 竞态重复修复（前端）

- [x] 2.1 在 `ProfessorsClient.tsx` 中新增 `fetchVersionRef = useRef(0)`
- [x] 2.2 filter useEffect 开头递增 `fetchVersionRef.current`，请求回调中检查版本号，过期则 return
- [x] 2.3 在 `loadMore` 中同样捕获当前版本号，回调中对比版本号，过期则丢弃

## 3. Bug 3 — 放大镜强制触发（前端）

- [x] 3.1 新增 `searchTick` state，`triggerSearch` 中递增
- [x] 3.2 filter useEffect 依赖数组加入 `searchTick`

## 4. Bug 4 — 深搜入口统一（前端）

- [x] 4.1 入口 1（无结果卡片，~line 576）：搜索词从 `search` 改为 `debouncedSearch`
- [x] 4.2 入口 3（banner，~line 748）：点击时自动调用 `handleDeepSearch(debouncedSearch, university)`
- [x] 4.3 入口 3 显示条件收紧：仅在 `professors.length > 0` 时显示 banner

## 5. 验证

- [x] 5.1 `npm run build` 通过，无 TypeScript 错误
- [x] 5.2 手动测试 4 个 bug 的复现步骤确认修复
