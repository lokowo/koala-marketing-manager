# add-fetch-papers-filters — 为论文抓取脚本增加筛选参数并修复 1000 行截断

## 背景

教授详情页（`app/professor/[slug]/page.tsx`）的「代表论文」区块读取 `papers` 表，按 `professor_id` 关联。
`papers` 表的数据由 `scripts/fetch-papers.ts` 从 Semantic Scholar 抓取，每位教授取引用最高的 5 篇。

## 现存问题

1. **没有筛选参数** —— 脚本一次性处理全库教授。Semantic Scholar 限速导致每位教授至少 1.1 秒，
   全库 25141 位需要 8 小时以上。手工录入单个教授后想补论文，没有可用路径。

2. **查询被 1000 行截断** —— `main()` 中查询 professors 时没有分页：

   ```ts
   .from('professors').select('id, name, university, semantic_scholar_id')
    .order('opportunity_score', { ascending: false })
   ```

   Supabase 单次查询默认最多返回 1000 行，所以脚本实际只处理机会分最高的前 1000 位，
   但日志打印的是 `Found 1000 professors`，看起来像是全部。机会分低的教授永远轮不到。

## 修复方向

1. **增加命令行参数**（`process.argv` 解析，不引入新依赖）：
   - `--id=<uuid>`：只处理这一位教授（`professors.id`）
   - `--slug=<slug>`：只处理这一位教授（`professors.slug`）
   - `--verified-missing`：只处理 `verification_status = 'Verified'` 且 `papers` 表中还没有任何记录的教授
   - `--limit=<n>`：最多处理 n 位教授（可与其他任意一个组合）
   - 不带任何参数：保持现有行为（全部教授，按 `opportunity_score` 降序）

2. **修复 1000 行截断** —— professors 查询改为分页拉取（每页 1000，`.range(from, to)` 循环直到取完），
   `all` 与 `verified-missing` 两种模式都拿到完整结果集。

3. **日志** —— 进入循环前打印筛选模式（single / verified-missing / all）与真实的待处理数量。

## 涉及文件

- `scripts/fetch-papers.ts` —— 仅此一个文件。

## 非目标

- 不改抓取逻辑本身：`searchSSAuthor` / `fetchSSPapers` 的请求 URL、fields、`limit=5`、`sort=citationCount:desc`。
- 不改 `loadEnv`、限速 `SS_DELAY_MS` / `ssDelay()`、429 重试与超时处理。
- 不改 `papers` 表 upsert 的字段映射与 `onConflict: 'semantic_scholar_id'`。
- 不改「存储的 SS ID 返回 0 篇就清掉重搜」这段逻辑。
- 不改结尾统计框的输出格式。
- 不新增 npm script，不改 `package.json`。
