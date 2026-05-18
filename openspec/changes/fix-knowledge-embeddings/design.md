## Context

诊断结果：3644 条 knowledge_chunks 全部有 vector(1536) embedding。直接 SQL 查询验证搜索正常工作。问题出在阈值过高（0.7）和 UI 错误处理缺失。

## Goals / Non-Goals

**Goals:**
- 修复语义搜索使其返回有意义的结果
- Admin 能看到 API 错误（不再静默失败）
- 提供 backfill 能力用于未来 embedding 缺失场景

**Non-Goals:**
- 不重建现有 embedding（已验证为正常 vector 数据）
- 不更改 embedding 模型或维度

## Decisions

1. 阈值设为 0.45 — 经实际数据测试，同主题文档 similarity 在 0.5-0.6，0.45 覆盖合理的语义相关范围且不引入太多噪音
2. Backfill API 采用批量处理（每次最多 100 条），避免 Vercel function timeout
