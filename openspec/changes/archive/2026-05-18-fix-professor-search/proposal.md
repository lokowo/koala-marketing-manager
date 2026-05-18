# fix-professor-search — 诊断报告

## Bug 1：多词搜索失败

### 现象
搜 "dewei chu" 返回 0 结果，但搜 "dewei" 能正确返回 Dewei Chu。

### 根因
`app/lib/services/professorService.ts:183-188` — Supabase `.or()` 查询将所有搜索词展开为 `name.ilike.%dewei%,name.ilike.%chu%,university.ilike.%dewei%,...` 的 OR 条件。这会返回任何字段包含 "dewei" **或** "chu" 的所有教授行。

但关键问题在 `:124` — 当有搜索时 `.limit(500)` 限制了返回行数。"chu" 作为常见姓氏，OR 匹配可能返回大量无关教授，将 500 行配额占满。

随后 `:196-203` 的 JavaScript AND 过滤要求**每个词**都出现在 `name+university+faculty` 组合中。如果目标教授 "Dewei Chu" 不在前 500 行 OR 结果中，AND 过滤后得到 0 条。

### 修复方案
将 `.limit(500)` 改为 `.limit(2000)` 可以缓解，但根本修复应改进 Supabase 查询策略：

```typescript
// 方案 A（推荐）：对多词搜索，用 AND 而非 OR 构建查询条件
if (allTerms.length > 1) {
  // 每个词分别构建 OR（name/university/faculty），然后用链式 .or() 实现 AND 语义
  // PostgREST 不支持 nested AND-of-ORs，所以改为：
  // 第一个词做 .or() 过滤，后续词用 JS AND 过滤
  // 但 limit 从 500 提高到 2000 以覆盖足够多的结果
  const primaryTerm = allTerms[0];
  q = q.or([
    `name.ilike.%${primaryTerm}%`,
    `university.ilike.%${primaryTerm}%`,
    `faculty.ilike.%${primaryTerm}%`,
  ].join(','));
} else {
  q = q.or(conditions.join(','));
}
```

这样只用第一个词做数据库过滤（大幅缩小结果集），剩余词由已有的 JS AND 过滤处理。

---

## Bug 2：搜索结果累加 / 卡片重复

### 现象
改搜索词后新结果累加到旧结果上，出现 3 个 Dewei Chu。

### 根因
`app/koala/professors/ProfessorsClient.tsx:213-233` — filter 变化时的 `useEffect` 在 `:215` 执行 `setProfessors([])`，但 `loadMore`（`:参考之前无限滚动修复`）中的 `setProfessors(prev => [...prev, ...new])` 可能已经有一个挂起的 Promise。

时序问题：
1. 用户输入 "dewei"，触发 debounce → `setDB("dewei")`
2. filter useEffect 清空 `professors`，发起请求 A
3. 用户快速改为 "dewei chu"，触发 debounce → `setDB("dewei chu")`
4. filter useEffect **再次**清空 `professors`，发起请求 B
5. 请求 A 的 `.then()` 先返回 → `setProfessors(d.data)` 写入 "dewei" 的结果
6. 请求 B 的 `.then()` 返回 → `setProfessors(d.data)` 覆盖为 "dewei chu" 的结果

但实际代码 `:224` 用的是 `setProfessors(d.data)` 而非追加模式，所以主搜索不会累加。累加来源是 **`loadMore`** (`:setProfessors(prev => [...prev, ...d.data.filter(...)])`)：filter 变更时如果有 `loadMore` 的 Promise 正在飞行，清空操作（`:215 setProfessors([])`）先执行，随后 `loadMore` 的旧 Promise resolve 并追加旧数据。

另一个叠加因素：`:206-227` 的 research_areas 二次搜索在 `professorService.ts` 中也可能带入重复——虽然有 `nameUniMatched` 去重（`:221`），但如果同一教授的 `id` 在第一次查询中未命中（因 limit 截断），却在第二次 allQ 中命中了 research_areas，可能出现一个教授同时在两个结果集中。

### 修复方案
1. 在 filter 变化的 useEffect 中加一个 `abortController`/版本号，让过期请求的回调不执行状态更新：

```typescript
useEffect(() => {
  const version = ++fetchVersionRef.current;
  setLoading(true);
  setProfessors([]);
  // ...
  apiFetch(filters).then(d => {
    if (version !== fetchVersionRef.current) return; // stale
    setProfessors(d.data);
    // ...
  });
}, [debouncedSearch, ...]);
```

2. 同样在 `loadMore` 中检查版本号，过期的追加请求直接丢弃。

---

## Bug 3：放大镜按钮点击有时无响应

### 现象
点搜索按钮偶尔没反应，需要多次点击。

### 根因
`app/koala/professors/ProfessorsClient.tsx:206-208` — `triggerSearch` 的实现是：

```typescript
const triggerSearch = useCallback(() => {
  setDB(search.trim());
}, [search]);
```

`setDB` 即 `setDebouncedSearch`。如果 300ms 的 debounce timer（`:198-203`）已经触发过一次 `setDB(search.trim())`，那么用户再点按钮时 `setDB` 传入的值与当前 `debouncedSearch` 相同 → React 判断 state 未变 → **不触发** filter useEffect → 搜索不执行。

典型场景：用户输入 "dewei"，等 300ms 后 debounce 已经设好 `debouncedSearch = "dewei"`。此时用户不改文字，直接点放大镜 → `setDB("dewei")` = no-op。

### 修复方案
给 `triggerSearch` 加一个强制刷新机制：

```typescript
const [searchTick, setSearchTick] = useState(0);
const triggerSearch = useCallback(() => {
  setDB(search.trim());
  setSearchTick(t => t + 1); // force re-trigger
}, [search]);

// filter useEffect 加上 searchTick 依赖
useEffect(() => {
  // ...search logic...
}, [debouncedSearch, searchTick, category, ...]);
```

或者更简洁地：直接在 `triggerSearch` 中内联执行搜索逻辑，绕过 useEffect。

---

## Bug 4：AI 深搜引导不一致

### 现象
无结果时「AI 深度搜索」入口的展示/文案不稳定，有时自动执行深搜，有时不执行。

### 根因
深搜 UI 有 3 个独立入口，行为不一致：

| 位置 | 行号 | 条件 | 行为 |
|------|------|------|------|
| 无结果卡片中的按钮 | `:576-587` | `professors.length === 0 && !loading && search` | 点击后 **自动调用** `handleDeepSearch(search, university)` |
| 全网搜索无结果后的按钮 | `:726-740` | `!searching && searchDone && candidates.length === 0` | 点击后 **自动调用** `handleDeepSearch(debouncedSearch, university)` |
| 结果列表下方的 banner | `:748-895` | `debouncedSearch && !loading` | 点击后仅 **展开面板**，不自动搜索 |

问题：
1. **入口 1 用 `search`（实时值），入口 2 用 `debouncedSearch`（延迟值）** — 如果用户快速切换，两者可能不同步
2. **入口 1 和 2 自动调用 `handleDeepSearch`**，但入口 3 只展开面板 — 用户体验不一致
3. **入口 3 的显示条件 `debouncedSearch && !loading`** 过于宽松 — 即使主搜索有结果也显示，与"找不到教授"场景不匹配
4. **入口 1 的显示条件** 不检查 `debouncedSearch`，只看 `search` — 在 debounce 期间可能闪烁

### 修复方案
统一为一套逻辑：

1. 所有入口统一使用 `debouncedSearch` 作为搜索词来源
2. 入口 1（无结果卡片）和入口 2（全网搜索无结果）保持自动调用行为
3. 入口 3（banner）改为：仅在 `professors.length > 0` 时显示（有结果但可能不是你要的）
4. 入口 3 点击后也自动调用 `handleDeepSearch(debouncedSearch, university)`

---

## 重构 vs 局部 patch 决策

**推荐：局部 patch，不做整体重构。**

理由：
- 4 个 bug 的根因都是具体的逻辑缺陷，不是架构问题
- 搜索 state machine 的整体设计（debounce → filter useEffect → loadMore）是合理的
- 重构风险高（组件 900+ 行，涉及无限滚动、深搜、候选人录入等多个功能），bug 修复不应引入不必要的变更
- 每个 patch 都是 5-15 行代码变更，局部性好

## 影响范围

| 文件 | 修改内容 |
|------|----------|
| `app/lib/services/professorService.ts` | Bug 1: 改多词搜索的查询策略 |
| `app/koala/professors/ProfessorsClient.tsx` | Bug 2: 加 fetchVersion 防竞态 |
| `app/koala/professors/ProfessorsClient.tsx` | Bug 3: triggerSearch 强制刷新 |
| `app/koala/professors/ProfessorsClient.tsx` | Bug 4: 统一深搜入口逻辑 |

## 测试要点

### Bug 1 复现
1. 打开教授库页面
2. 输入 "dewei chu" → 应返回 Dewei Chu
3. 输入 "john smith" → 应返回名为 John Smith 的教授
4. 输入 "unsw machine learning" → 应返回 UNSW 的机器学习方向教授

### Bug 2 复现
1. 搜索 "dewei" → 得到结果
2. 快速改为 "john" → 结果应只有 john 相关，不含 dewei 结果
3. 反复快速切换搜索词 → 不应出现重复卡片
4. 滚动加载后更改搜索词 → 列表应完全替换为新结果

### Bug 3 复现
1. 输入 "dewei"，等 1 秒（debounce 已触发）
2. 不改文字，直接点放大镜按钮 → 应重新执行搜索
3. 清空搜索框，输入新词，立即点放大镜 → 应立即搜索

### Bug 4 复现
1. 搜索一个不存在的教授名（如 "xyzabc123"）→ 无结果时应显示 AI 深搜入口
2. 搜索 "dewei" 有结果时 → 结果下方的 banner 应显示"不是你要找的教授？"
3. 点击 AI 深搜按钮 → 应自动开始搜索，不需要用户再点一次
4. 所有入口的搜索词应一致（不出现实时值 vs 延迟值不匹配）
