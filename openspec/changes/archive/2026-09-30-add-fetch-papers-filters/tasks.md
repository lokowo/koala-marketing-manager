## 1. 参数解析

- [x] 1.1 用 `process.argv` 解析 `--id` / `--slug` / `--verified-missing` / `--limit`，不引入新依赖
- [x] 1.2 新增 `printUsage()`，无法识别的参数 → 打印用法说明后 `process.exit(1)`
- [x] 1.3 `--id` 与 `--slug` 同时出现 → 报错退出（只能二选一）
- [x] 1.4 `--limit` 非正整数 → 报错退出

## 2. 分页拉取（修复 1000 行截断）

- [x] 2.1 新增 `fetchAllPages` 助手，按每页 1000 用 `.range()` 循环直到取完
- [x] 2.2 `all` 模式经分页拉取全部教授（order by opportunity_score desc）
- [x] 2.3 `single` 模式按 id/slug 单条查询，查不到 → 报错退出
- [x] 2.4 `verified-missing` 模式：分页拉取 papers.professor_id 去重成 Set，再分页拉取 Verified 教授并过滤（不用 .in()）

## 3. 日志

- [x] 3.1 进入循环前打印筛选模式（single / verified-missing / all）
- [x] 3.2 打印真实的待处理教授数量（应用 --limit 后的数字）

## 4. 保持不变

- [x] 4.1 确认 loadEnv / searchSSAuthor / fetchSSPapers / 限速 / 429 重试 / 超时 未改动
- [x] 4.2 确认 upsert 字段映射与 onConflict、「0 篇清 ID 重搜」、结尾统计框格式 未改动

## 5. 验证

- [x] 5.1 `--id=bd582183-1092-4947-981e-a0cbdeb337aa` 单教授模式：显示 single、1 位、✅、Papers saved > 0、10 秒内结束
- [x] 5.2 `--verified-missing --limit=3`：显示将处理 3 位，且运行前 papers 表确无记录
- [x] 5.3 `--bogus`：打印用法说明、非 0 退出、不发起任何 SS 请求
- [x] 5.4 `npm run lint` 无新增错误
