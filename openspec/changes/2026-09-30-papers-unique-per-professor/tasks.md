## A. 加新复合唯一约束（旧约束保留）

- [ ] A.1 apply_migration `papers_unique_professor_paper`：ADD CONSTRAINT papers_professor_paper_key UNIQUE (professor_id, semantic_scholar_id)
- [ ] A.2 验证 pg_constraint：两个唯一约束同时存在

## B. 改 5 处代码

- [ ] B.1 全仓 grep 确认只有 5 处 onConflict: 'semantic_scholar_id'，且 rows 都带 professor_id
- [ ] B.2 5 处统一改为 { onConflict: 'professor_id,semantic_scholar_id' }
- [ ] B.3 确认 fetch-papers.ts 删旧逻辑仍 .eq('professor_id', prof.id)
- [ ] B.4 npm run lint 无新增错误；npm run build 通过
- [ ] B.5 只 stage 5 文件 + openspec 产物，commit/push（禁止 git add -A）
- [ ] B.6 等 Vercel 最新 deployment 状态 READY

## C. 删旧的全表唯一约束

- [ ] C.1 apply_migration `papers_drop_global_paper_unique`：DROP CONSTRAINT papers_semantic_scholar_id_key
- [ ] C.2 验证 pg_constraint：只剩 papers_pkey 与 papers_professor_paper_key（+ fk）

## D. 恢复受影响教授

- [ ] D.1 npx tsx scripts/fetch-papers.ts --slug=yan-wang-mq --ss-id=2152541925
- [ ] D.2 npx tsx scripts/fetch-papers.ts --slug=longbing-cao --ss-id=2148761004
- [ ] D.3 验证 MQ School of Computing 9 位各 5 篇
- [ ] D.4 验证两篇合著综述同时挂在 yan-wang-mq 与 longbing-cao 名下
