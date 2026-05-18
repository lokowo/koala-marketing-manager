## 1. 修复 RPC 关键词匹配逻辑

- [x] 1.1 修改 `search_professors_v2` RPC：将分类关键词匹配从 `ILIKE '%' || kw || '%'` 改为 `~* ('\m' || kw || '\M')`（词边界正则）
- [x] 1.2 验证修改后的 RPC：bio 分类 total 应减少约 1,086（从 ~5,449 降至 ~4,363），health 分类不受显著影响

## 2. 新建批量计数 RPC 和 API

- [x] 2.1 创建 `get_professor_category_counts` RPC 函数：单次查询使用 `COUNT(*) FILTER (WHERE ...)` 返回所有 8 个分类的计数 + 总数
- [x] 2.2 创建 `app/api/professors/counts/route.ts`：调用新 RPC，返回 `{ counts: Record<string, number> }`
- [x] 2.3 验证 counts 端点：每个分类的计数应与主列表 API 的 total 一致

## 3. 前端对接

- [x] 3.1 修改 `ProfessorsClient.tsx`：将 mount 时的 8 个并行 fetch 替换为单次 `GET /api/professors/counts`
- [x] 3.2 确认 count 加载失败时不显示 "0"（保持 null → 隐藏计数）

## 4. 端到端验证

- [x] 4.1 验证：选中「生命科学」→ 不出现 "Maternal and Child Health" 教授
- [x] 4.2 验证：选中「医学健康」→ 出现 "Maternal and Child Health" 教授且计数 > 0
- [x] 4.3 验证：所有分类计数之和 ≥ 总量（允许交叉），每个分类计数 > 0
- [x] 4.4 验证：切换分类后右侧列表完全替换，无交叉污染
