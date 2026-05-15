## Why

AI 深搜使用 Haiku 模型 + web_search，虽然能找到结果，但搜索质量不够稳定。Sonnet 的 web_search 效果显著优于 Haiku。同时搜索策略需要增加名字颠倒变体和更多查询模式，提高命中率。

已有功能确认：
- ✅ `normalizeProfessorName("xianghaiAN")` → "Xianghai An"（正确）
- ✅ URL 粘贴录入 API + UI 已完整实现
- ✅ maxDuration=60 已设置
- ✅ 错误信息已正确展示

## What Changes

1. **升级深搜模型**：`claude-haiku-4-5-20251001` → `claude-sonnet-4-6`
2. **增强搜索策略 prompt**：
   - 添加名字颠倒变体（"Xianghai An" → also try "An Xianghai"）
   - 增加 `.edu.au` 优先搜索
   - 增加 "PhD supervisor" 查询
   - max_uses 从 5 提到 8
3. **移除 OpenAlex 从搜索路径**：`searchProfessorAllSources` 中移除 OpenAlex 调用（OpenAlex 用于文献数据库，不用于教授搜索）

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
_(none)_

## Impact

- `app/lib/services/professorAutoAdd.ts` — `searchClaudeCandidates` 模型 + prompt 升级；`searchProfessorAllSources` 移除 OpenAlex
