## MODIFIED Requirements

### Requirement: 同一篇论文可属于多位教授
`papers` 表 SHALL 以 `(professor_id, semantic_scholar_id)` 为唯一键，允许同一篇论文（同一 paperId）
出现在多位合著教授名下，每位教授下不重复。

#### Scenario: 合著论文不再互相顶替
- **WHEN** 两位教授合著同一篇论文，先后写入各自的论文集
- **THEN** 该论文在两位教授名下各保留一行，后写入者不再改动前者的行

#### Scenario: 单位教授内仍去重
- **WHEN** 同一位教授的同一篇论文被重复 upsert
- **THEN** 命中 `(professor_id, semantic_scholar_id)` 唯一键，更新而非新增

### Requirement: upsert 使用复合冲突键
所有向 `papers` 表 upsert 的代码 SHALL 使用 `onConflict: 'professor_id,semantic_scholar_id'`。

#### Scenario: 五处写入统一冲突键
- **WHEN** cron 同步、研究分析、教授刷新服务、fetch-papers 脚本、collect-professors 脚本写入论文
- **THEN** 均以 `(professor_id, semantic_scholar_id)` 为冲突目标，且写入行都带 `professor_id`

#### Scenario: 删除旧论文仍按教授限定
- **WHEN** `fetch-papers` 用新的前 5 篇替换某教授旧论文
- **THEN** 删除范围 SHALL 仍 `.eq('professor_id', prof.id)` 限定，不影响其他教授（含合著者）的行
