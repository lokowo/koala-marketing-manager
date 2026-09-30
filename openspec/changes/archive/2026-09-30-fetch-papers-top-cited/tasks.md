## 1. fetchSSPapers 本地排序取前 5

- [x] 1.1 去掉 URL 的 `&sort=...`，改 `limit=1000`，fields 不变，修正误导性注释
- [x] 1.2 有 next/total 时用 offset 翻页，最多累计 3000 篇
- [x] 1.3 本地按 citationCount desc, year desc 排序取前 5
- [x] 1.4 返回 `{ status: 'ok' | 'rate_limited' | 'error', papers }`

## 2. 429 处理

- [x] 2.1 新增统一重试助手，429 按 5s/15s/30s 重试最多 3 次
- [x] 2.2 searchSSAuthor 与 fetchSSPapers 都经由它，耗尽仍 429 返回 rate_limited
- [x] 2.3 主循环遇 rate_limited 打印 `[rate limited — skipped]`，不写库/不改 ID/不重搜
- [x] 2.4 统计框新增 `Rate limited: N`
- [x] 2.5 仅 status==='ok' 且 papers.length===0（且来源 stored-id）才走原「0 篇重搜」

## 3. 无效 ID 视为空

- [x] 3.1 stored semantic_scholar_id 非 `/^\d+$/` 一律当 null，直接走姓名搜索

## 4. searchSSAuthor 收紧匹配

- [x] 4.1 uniKeywords 去括号 + 停用词过滤
- [x] 4.2 search limit 5→20，fields 含 affiliations/hIndex/paperCount
- [x] 4.3 全名逐词匹配（小写+去重音 NFD）
- [x] 4.4 第 1 轮全名+affiliation+paperCount>0，多命中取 paperCount 最大
- [x] 4.5 第 2 轮全名+paperCount>=5，≥2 候选判 ambiguous 返回 null 并打印
- [x] 4.6 删除原第 3 轮
- [x] 4.7 返回所选候选 { authorId,name,affiliations,hIndex,paperCount } 供预览

## 5. --dry-run

- [x] 5.1 可与任意筛选模式组合
- [x] 5.2 照常搜索/抓取/排序但不写任何库（不 update/upsert/delete）
- [x] 5.3 每位打印块：SS author 行 + 匹配方式 + Top 5
- [x] 5.4 未找到/歧义/限流打印原因并列出 search 前 5 候选

## 6. --ss-id

- [x] 6.1 仅能与 --id/--slug 同用，否则报错退出
- [x] 6.2 值必须纯数字，否则报错退出
- [x] 6.3 跳过搜索直接用该 ID；非 dry-run 写回 professors.semantic_scholar_id
- [x] 6.4 用法说明补充 --ss-id 与 --dry-run

## 7. 替换旧论文

- [x] 7.1 非 dry-run 且 status==='ok' 且有论文：upsert 5 篇后删除该 professor_id 下不在这 5 篇内的旧记录
- [x] 7.2 upsert 失败则不删除
- [x] 7.3 打印 `✅ +5 (-N old)`

## 8. 前台个人页

- [x] 8.1 papers 查询排序改为 citation_count desc, year desc；limit(10) 不变

## 9. 验证

- [x] 9.1 npm run lint 无新增错误；npm run build 通过
- [x] 9.2 --bogus / --ss-id=abc --slug=jia-wu / --ss-id=123（不带 slug）均用法说明+非 0 退出+无 SS 请求
- [x] 9.3 MQ 计算学院 9 位 dry-run，输出保存到文件
- [x] 9.4 确认 9 位 papers 行数与 semantic_scholar_id 均未变化
