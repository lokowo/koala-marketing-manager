## MODIFIED Requirements

### Requirement: 论文按引用取前 5 篇
`scripts/fetch-papers.ts` 的 `fetchSSPapers` SHALL 拉取作者全部（上限 3000）论文并在本地排序，取引用最高的 5 篇，
不依赖 Semantic Scholar 接口不支持的 `sort` 参数。

#### Scenario: 本地按引用降序取前 5
- **WHEN** 某作者有大量论文
- **THEN** 请求以 `limit=1000` 翻页（最多累计 3000 篇），本地按 `citationCount` 降序、同引用按 `year` 降序排序后取前 5 篇

#### Scenario: 排序不再依赖接口 sort
- **WHEN** 构造 `/author/{id}/papers` 请求
- **THEN** URL 不包含 `sort` 参数

### Requirement: 429 限流与「0 篇」区分
脚本 SHALL 区分「限流」与「ID 错误/无论文」，限流时不写库、不改 ID、不触发重搜。

#### Scenario: 429 重试后仍限流
- **WHEN** 请求连续遇到 429，按 5s/15s/30s 重试 3 次后仍是 429
- **THEN** 本位教授打印 `[rate limited — skipped]`，不写 papers、不改 `semantic_scholar_id`、不触发「0 篇重搜」，统计框 `Rate limited` 计数 +1

#### Scenario: 仅确证 0 篇才重搜
- **WHEN** 抓取状态为 `ok` 且返回 0 篇，且来源是 stored-id
- **THEN** 才走原「0 篇清 ID 重搜」逻辑；限流或错误状态均不触发

### Requirement: 收紧作者匹配避免抓错人
`searchSSAuthor` SHALL 用更严格的规则匹配作者，歧义时拒绝猜测。

#### Scenario: 学校关键词剔除停用词
- **WHEN** 学校名为 `Macquarie University (MQ)`
- **THEN** 用于 affiliation 校验的关键词剥离括号内容并过滤停用词后仅剩 `["macquarie"]`

#### Scenario: 全名逐词匹配（去重音）
- **WHEN** 比较教授姓名与候选作者名
- **THEN** 两者均小写并去除重音（NFD），教授姓名的每个词都必须出现在候选名中

#### Scenario: 第 2 轮多候选判为歧义
- **WHEN** 无 affiliation 命中，但有 ≥ 2 个候选满足「全名匹配 + paperCount>=5」
- **THEN** 返回 null 并打印 `[ambiguous: N candidates]`，不猜测

### Requirement: 无效存储 ID 视为空
脚本 SHALL 将非纯数字的 `professors.semantic_scholar_id`（如 OpenAlex URL）视为 null。

#### Scenario: OpenAlex URL 当作无 ID
- **WHEN** `semantic_scholar_id` 不匹配 `/^\d+$/`
- **THEN** 直接走姓名搜索，不先拿它去请求

### Requirement: 重跑替换旧论文
非 dry-run 且抓取成功且有论文时，脚本 SHALL 用新的前 5 篇替换该教授的旧论文。

#### Scenario: upsert 后清理旧记录
- **WHEN** 成功 upsert 5 篇新论文
- **THEN** 删除该 `professor_id` 下 `semantic_scholar_id` 不在这 5 篇之内的旧记录，并打印 `✅ +5 (-N old)`

#### Scenario: upsert 失败不删除
- **WHEN** upsert 返回错误
- **THEN** 不执行删除

## ADDED Requirements

### Requirement: 预览模式 --dry-run
脚本 SHALL 支持 `--dry-run`，照常搜索/抓取/排序但不写任何数据库。

#### Scenario: 预览不写库
- **WHEN** 带 `--dry-run` 运行
- **THEN** 不 update professors、不 upsert papers、不 delete papers，并为每位教授打印 SS author 行、匹配方式与 Top 5

#### Scenario: 异常也打印候选
- **WHEN** 某教授未找到 / 歧义 / 限流
- **THEN** 打印原因，并列出 search 返回的前 5 个候选（authorId、名字、affiliations、hIndex、paperCount）

### Requirement: 人工指定作者 --ss-id
脚本 SHALL 支持 `--ss-id=<authorId>` 人工指定 SS 作者 ID。

#### Scenario: 仅配合单教授
- **WHEN** `--ss-id` 未与 `--id` 或 `--slug` 同用
- **THEN** 打印用法说明并以非 0 退出

#### Scenario: 必须纯数字
- **WHEN** `--ss-id` 的值不是纯数字
- **THEN** 打印用法说明并以非 0 退出

#### Scenario: 跳过搜索直接使用
- **WHEN** `--ss-id` 合法且与 `--id`/`--slug` 同用
- **THEN** 跳过姓名搜索直接使用该 ID；非 dry-run 时写回 `professors.semantic_scholar_id`
