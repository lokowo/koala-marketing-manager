# 设计说明

## fetchSSPapers：本地排序取前 5

签名改为返回判别结果：

```ts
type FetchResult = { status: 'ok' | 'rate_limited' | 'error'; papers: SSPaper[] };
async function fetchSSPapers(authorId: string): Promise<FetchResult>
```

- URL 去掉 `&sort=...`（无效），改 `limit=1000`（接口单页上限），`fields` 不变。
- 若响应含 `next`（或 `offset + data.length < total`）且已取 < 3000，用 `offset` 继续翻页，累计上限 3000 篇。
- 全部拿到后本地排序：`citationCount` 降序，同引用按 `year` 降序；`slice(0, 5)`。
- 429 → 走统一重试助手（见下）；耗尽仍 429 → `{ status: 'rate_limited', papers: [] }`。
- 其他非 2xx / 异常 → `{ status: 'error', papers: [] }`。
- 修正函数上方与 `sort` 相关的误导性注释。

## 统一 429 重试

新增助手 `ssFetch(url)`：对同一 URL 遇 429 按 5s / 15s / 30s 依次等待重试，最多 3 次；
返回 `{ res, rateLimited }`。`searchSSAuthor` 与 `fetchSSPapers` 都经由它发请求（仍先 `ssDelay()` 限速）。

## searchSSAuthor 收紧匹配

返回改为候选详情（供预览）：

```ts
type AuthorMatch =
  | { status: 'ok'; pass: 'search-pass-1' | 'search-pass-2'; author: SSAuthor }
  | { status: 'ambiguous'; count: number; candidates: SSAuthor[] }
  | { status: 'none'; candidates: SSAuthor[] }
  | { status: 'rate_limited' };
```

- `uniKeywords`：先剥离括号内容（`replace(/\([^)]*\)/g, ' ')`），小写切词，过滤停用词
  `university, institute, college, school, technology, of, the, and, faculty, department`（及长度<=1）。
  `"Macquarie University (MQ)"` → `["macquarie"]`。
- search `limit=20`，`fields=authorId,name,affiliations,hIndex,paperCount`。
- 名字规范化 `norm(s)`：小写 + `normalize('NFD').replace(/[̀-ͯ]/g,'')` 去重音；
  「全名逐词匹配」= `name` 的每个词都出现在候选 `c.name` 的规范化文本里。
- 第 1 轮：全名匹配 + affiliation 命中任一 `uniKeyword` + `paperCount > 0`；多个命中取 `paperCount` 最大 → `pass-1`。
- 第 2 轮：全名匹配 + `paperCount >= 5`；若满足者 ≥ 2 → `ambiguous`（返回候选、打印数量）；恰好 1 → `pass-2`。
- 删除原第 3 轮。
- 未命中 → `none`，附带 search 返回的候选（前 5 个用于预览）。

## 主循环整合

对每位教授：

1. 解析 `ssId`：`--ss-id` > stored（仅当 `/^\d+$/`）> 否则 null。
2. `ssId == null` 且非 `--ss-id`：调 `searchSSAuthor`。
   - `rate_limited` → 打印 `[rate limited — skipped]`，`rateLimited++`，跳过。
   - `ambiguous` → 打印 `[ambiguous: N candidates]`，dry-run 时列候选，跳过（不写）。
   - `none` → `[no SS ID]`，dry-run 列候选，`noId++`，跳过。
   - `ok` → 用 `author.authorId`，记 `matchedVia = pass`。
3. 有 `ssId` → `fetchSSPapers`。
   - `rate_limited` → `[rate limited — skipped]`，`rateLimited++`，跳过（不改 ID、不重搜）。
   - `error` → 视为无结果，`[error]`，跳过（不触发重搜）。
   - `ok` 且 `papers.length === 0`：仅当来源是 stored-id 时走原「0 篇清 ID 重搜」逻辑（重搜同样处理三态）。
   - `ok` 且有论文 → 写库（非 dry-run）。
4. 写库：upsert 5 篇（`onConflict` 不变）成功后，删除该 `professor_id` 下 `semantic_scholar_id` 不在这 5 篇 paperId 内的旧记录；upsert 失败不删。打印 `✅ +5 (-N old)`。
5. `--ss-id` 非 dry-run 时把该 ID 写回 `professors.semantic_scholar_id`。

## dry-run 打印块

```
[slug] 教授姓名
  SS author: <authorId> | <SS名> | aff: <affiliations 或 (none)> | h=<hIndex> | papers=<paperCount>
  匹配方式: stored-id / search-pass-1 / search-pass-2 / --ss-id
  Top 5:
    1. (<citationCount>) <year> <title>
    ...
```

未找到 / 歧义 / 限流也打印原因，并列出 search 前 5 个候选（authorId、名字、affiliations、hIndex、paperCount）。

## 参数校验（新增）

- `--ss-id` 值必须纯数字，否则用法说明 + 退出。
- `--ss-id` 未与 `--id`/`--slug` 同用 → 用法说明 + 退出。
- `--dry-run` 可与任意模式组合。
- 用法说明补充 `--ss-id`、`--dry-run`。

## 前台个人页

`app/professor/[slug]/page.tsx` papers 查询：
`.order('year', { ascending:false })` → `.order('citation_count',{ascending:false}).order('year',{ascending:false})`；
`limit(10)` 不变。纯排序调整，无 UI/样式变化。
