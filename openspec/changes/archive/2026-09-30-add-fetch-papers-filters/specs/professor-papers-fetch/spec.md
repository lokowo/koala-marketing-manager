## ADDED Requirements

### Requirement: 论文抓取脚本支持命令行筛选参数
`scripts/fetch-papers.ts` SHALL 支持通过 `process.argv` 解析的命令行参数选择待处理的教授子集，不引入新依赖。

#### Scenario: 按 id 处理单个教授
- **WHEN** 运行 `--id=<uuid>`
- **THEN** 脚本 SHALL 只处理该 `professors.id` 对应的教授；查不到时打印明确错误并以非 0 退出

#### Scenario: 按 slug 处理单个教授
- **WHEN** 运行 `--slug=<slug>`
- **THEN** 脚本 SHALL 只处理该 `professors.slug` 对应的教授；查不到时打印明确错误并以非 0 退出

#### Scenario: id 与 slug 互斥
- **WHEN** 同时提供 `--id` 与 `--slug`
- **THEN** 脚本 SHALL 打印错误提示只能二选一，并以非 0 退出

#### Scenario: 批量补齐已验证但缺论文的教授
- **WHEN** 运行 `--verified-missing`
- **THEN** 脚本 SHALL 只处理 `verification_status = 'Verified'` 且 `papers` 表中还没有任何记录的教授

#### Scenario: 限制处理数量
- **WHEN** 提供 `--limit=<n>`（n 为正整数），可与其他任意一个参数组合
- **THEN** 脚本 SHALL 最多处理 n 位教授

#### Scenario: limit 非法
- **WHEN** `--limit` 的值不是正整数
- **THEN** 脚本 SHALL 报错并以非 0 退出

#### Scenario: 无法识别的参数
- **WHEN** 提供了不在白名单内的参数（如 `--bogus`）
- **THEN** 脚本 SHALL 打印用法说明并以非 0 退出，且不发起任何 Semantic Scholar 请求

#### Scenario: 不带参数保持原行为
- **WHEN** 不带任何参数运行
- **THEN** 脚本 SHALL 处理全部教授，按 `opportunity_score` 降序

### Requirement: professors 查询消除 1000 行截断
脚本 SHALL 分页拉取教授与 papers 数据，确保结果集不被 Supabase 单次 1000 行上限截断。

#### Scenario: 全量模式取到完整结果集
- **WHEN** `all` 模式运行且教授总数超过 1000
- **THEN** 脚本 SHALL 通过 `.range()` 分页循环拉取到全部教授，而非仅前 1000 位

#### Scenario: verified-missing 不用超长 in 列表
- **WHEN** 计算「已验证但缺论文」的教授
- **THEN** 脚本 SHALL 分页拉取 `papers.professor_id` 在内存去重成 Set 后过滤，不使用 `.in()` 传超长 id 列表

### Requirement: 循环前打印真实筛选模式与数量
脚本 SHALL 在进入处理循环前输出筛选模式与真实待处理数量。

#### Scenario: 打印模式与数量
- **WHEN** 参数解析与结果集拉取完成，进入循环前
- **THEN** 脚本 SHALL 打印筛选模式（single / verified-missing / all）与应用 `--limit` 之后的真实教授数量
