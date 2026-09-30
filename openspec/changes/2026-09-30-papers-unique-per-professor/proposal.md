# 2026-09-30-papers-unique-per-professor — papers 唯一约束改为「每位教授每篇论文唯一」

## 背景

`papers` 表当前约束：`UNIQUE (semantic_scholar_id)`，即一篇论文全表只能出现一次。
两位教授合著的论文只能挂在其中一人名下，upsert `onConflict: 'semantic_scholar_id'` 会把已有行的
`professor_id` 静默改成后写入的教授。

**实例**：`yan-wang-mq` 与 `longbing-cao` 合著的两篇推荐系统综述（S2 引用 634、540）被后写入的
Cao 抢走，Yan Wang 只剩 3 篇。

**正确语义**：同一篇论文可以属于多位教授，每位教授下不重复。
**新约束**：`UNIQUE (professor_id, semantic_scholar_id)`。

已确认：`papers` 表没有被任何表外键引用；当前约束为 `papers_semantic_scholar_id_key` (contype u)。

## 涉及代码（5 处 onConflict，全部改为 `'professor_id,semantic_scholar_id'`）

- `app/api/cron/sync-professors/route.ts`（第 84 行）
- `app/lib/server/research-analysis.ts`（第 185 行）
- `app/lib/services/professorRefreshService.ts`（第 67 行）
- `scripts/fetch-papers.ts`（第 554 行）
- `scripts/collect-professors.ts`（第 549 行）

已核实：5 处写入的 rows 都带 `professor_id`；全仓 grep 确认没有第 6 处。
`scripts/fetch-papers.ts` 的删除旧论文逻辑已按 `.eq('professor_id', prof.id)` 限定，改约束后语义不变。

## 执行顺序

- **A** 加新复合唯一约束（旧约束保留）
- **B** 改 5 处代码 → lint/build → 只 stage 5 文件 + openspec → commit/push → 等 Vercel READY
- **C** 删旧的全表唯一约束
- **D** 恢复受影响的 `yan-wang-mq`、`longbing-cao`，验证 9 位各 5 篇、合著论文同挂两人

## 非目标

- 除 5 处 `onConflict` 外不改任何逻辑。
- 不做全库回填或重跑其他教授（只恢复本次已知受影响的两位）。
