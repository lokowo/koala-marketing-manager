# 设计说明

## 参数解析

在 `main()` 开头（调用 Supabase 之前）用 `process.argv.slice(2)` 逐个解析：

- 识别 `--id=`、`--slug=`、`--verified-missing`、`--limit=` 四种。
- 任何以 `--` 开头但不在白名单内的 token → 打印用法说明后 `process.exit(1)`。
- 任何不以 `--` 开头的多余 token 同样视为无法识别 → 用法说明 + 退出。
- `--id` 与 `--slug` 同时出现 → 报错退出（只能二选一）。
- `--limit` 值不是正整数（`/^[1-9]\d*$/`）→ 报错退出。

用法说明函数 `printUsage()` 列出四个参数与示例，写到 stderr。

## 三种筛选模式

用一个内部变量 `mode: 'single' | 'verified-missing' | 'all'` 表示：

- 有 `--id` 或 `--slug` → `single`
- 有 `--verified-missing` → `verified-missing`
- 否则 → `all`

`--limit` 是正交的，对三种模式都生效（在拿到结果集后 `.slice(0, limit)`）。

## 分页拉取（消除 1000 行截断）

新增通用分页助手，避免 Supabase 单次 1000 行上限：

```ts
async function fetchAllPages<T>(build: (from: number, to: number) => any): Promise<T[]>
```

内部按 `PAGE = 1000` 循环 `.range(from, from + PAGE - 1)`，直到某页返回不足 `PAGE` 行为止。

- `all` 模式：分页拉取 `id, name, university, semantic_scholar_id`，`order('opportunity_score', desc)`。
- `single` 模式：按 `id` 或 `slug` 单条 `.eq().maybeSingle()`；查不到 → 报错退出。
- `verified-missing` 模式：
  1. 分页拉取 `papers` 表的 `professor_id`（只 select 这一列），在内存去重成 `Set<string>`。
  2. 分页拉取 `verification_status = 'Verified'` 的教授（`id, name, university, semantic_scholar_id`）。
  3. 过滤掉 `professor_id` 已在 Set 中的教授。
  - 不用 `.in()` 传超长 id 列表（会超出 URL 长度限制）。

## 日志

进入循环前：

```
Filter mode: <mode>
Will process <N> professor(s)
```

`<N>` 是应用 `--limit` 之后的真实数量。

## 不改动的部分

`loadEnv`、`searchSSAuthor`、`fetchSSPapers`、限速、429/超时、upsert 字段映射与 onConflict、
「0 篇清 ID 重搜」、结尾统计框格式 —— 全部保持原样。循环体逻辑不动，只替换其数据来源与前置日志。
