# 2026-09-30-fetch-papers-top-cited — 论文按引用取前 5 + 修正作者匹配 + 预览模式

## 背景（为什么改）

**A. 排序无效** —— `fetchSSPapers` 的 URL 带了 `&sort=citationCount:desc`，但 Semantic Scholar 的
`/author/{id}/papers` 接口不支持 `sort`，会静默忽略、实际按「最新优先」返回。结果 Amin Beheshti（H32）
抓到的 5 篇全是 2026 年、引用 1–3 的新论文。

**B. 作者匹配太宽** —— `searchSSAuthor` 的 `uniKeywords` 由学校名按空格切分保留长度 > 3 的词，
`"Macquarie University (MQ)"` → `["macquarie","university","(mq)"]`，其中 `university` 命中任何大学；
第 2 轮只要求「姓氏 + paperCount >= 5」，导致 `Yan Wang`、`Jia Wu`、`Mark Johnson` 这类常见名极易抓错人。

**C. 429 被当成「0 篇」** —— `fetchSSPapers` 遇 429 返回 `[]`，主循环把 `[]` 当作「存储 ID 错误」，
触发重搜并可能覆盖 `semantic_scholar_id`。限流不等于 ID 错误。

**D. 旧论文不会被替换** —— upsert 按 `papers.semantic_scholar_id` 冲突合并，重跑后旧的 5 篇仍留库；
前台个人页按 `year desc` 取 10 条，旧的 2026 新论文仍排在前面。（已确认 papers 表无其他表外键引用，
按 `professor_id` 删除安全）

**E. `professors.semantic_scholar_id` 混有 OpenAlex URL** —— 例如 `https://openalex.org/A5035107880`，
这不是 SS 作者 ID。

## 改动范围

只改两个代码文件：

- `scripts/fetch-papers.ts`
- `app/professor/[slug]/page.tsx`

其他调用 papers 表的地方（`app/api/*`、`app/koala/*`）一律不动。

## 修复方向

1. `fetchSSPapers`：去掉无效 `sort`，`limit=1000` 翻页（最多 3000 篇），本地按 `citationCount desc, year desc`
   排序取前 5；返回 `{ status: 'ok' | 'rate_limited' | 'error', papers }`。
2. 429：`fetchSSPapers` 与 `searchSSAuthor` 均按 5s/15s/30s 重试最多 3 次；仍限流则本位跳过，
   不写库、不改 ID、不触发重搜；统计框新增 `Rate limited: N`。
3. 无效 ID（非 `/^\d+$/`）一律当 null，直接走姓名搜索。
4. `searchSSAuthor` 收紧匹配：去括号 + 停用词过滤、search `limit=20`、全名逐词匹配（去重音）、
   第 1 轮全名+affiliation+paperCount>0 取 paperCount 最大、第 2 轮全名+paperCount>=5 但 ≥2 候选判为歧义返回 null、
   删除原第 3 轮；返回所选候选详情供预览。
5. 新增 `--dry-run`：照常搜索/抓取/排序但不写任何库，逐位打印候选与 Top 5。
6. 新增 `--ss-id=<authorId>`：仅配合 `--id`/`--slug`，纯数字校验，跳过搜索直接用该 ID。
7. 替换旧论文：非 dry-run 且 `status==='ok'` 且有论文时，upsert 成功后删除该 professor 下不在这 5 篇内的旧记录。
8. 前台个人页 papers 查询排序改为 `citation_count desc, year desc`。

## 非目标

- 不改 `loadEnv`、`ssDelay` 限速、`--id/--slug/--verified-missing/--limit`、分页拉取、upsert 字段映射、
  统计框其余各行。
- 不动 `app/api/*`、`app/koala/*` 等其他 papers 消费方。
- 完成后不对 MQ 计算学院 9 位做正式写库（仅 dry-run），正式写库由人工核对后再下达。
