# 设计说明

## 迁移策略：先加后删（零停机）

`papers` 当前有 12497 行，无表引用它。分两次 migration，中间夹代码上线：

1. **步骤 A（migration `papers_unique_professor_paper`）**：加复合唯一约束，旧约束保留。
   ```sql
   ALTER TABLE public.papers
     ADD CONSTRAINT papers_professor_paper_key UNIQUE (professor_id, semantic_scholar_id);
   ```
   现有数据必然满足（旧约束已保证 `semantic_scholar_id` 全表唯一，则 (professor_id, ssid) 更不可能重复）。
   两个唯一约束同时存在期间，旧代码（`onConflict: 'semantic_scholar_id'`）仍可正常工作。

2. **步骤 B**：把 5 处 `onConflict` 改成 `'professor_id,semantic_scholar_id'`，上线到 Vercel。
   复合约束此时已存在，新代码的 onConflict 目标有效。

3. **步骤 C（migration `papers_drop_global_paper_unique`）**：删旧的全表唯一约束。
   ```sql
   ALTER TABLE public.papers DROP CONSTRAINT papers_semantic_scholar_id_key;
   ```
   必须在 B 上线（Vercel READY）之后，避免线上旧代码引用已不存在的冲突目标。

4. **步骤 D**：重跑 `yan-wang-mq`、`longbing-cao` 恢复合著论文。删旧约束后，同一 paperId 可在两位
   教授名下各存一行；`fetch-papers` 的删旧逻辑仅按 `professor_id` 限定，互不影响。

## 为何顺序不能颠倒

- 先删旧约束再上线新代码：删除瞬间到新代码生效之间，若有并发写入且同一 paperId 属多位教授，
  会插入重复（旧代码 onConflict 目标失效报错）。故先加新约束、上线新代码、再删旧约束。

## 代码改动

5 处统一 `{ onConflict: 'professor_id,semantic_scholar_id' }`，其余不动。
所有 rows 已确认含 `professor_id`。`fetch-papers.ts` 删旧逻辑保持 `.eq('professor_id', prof.id)`。
