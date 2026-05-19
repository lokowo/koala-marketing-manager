## Why

用户上传毕业证书照片后点"AI解析"，教育经历板块始终显示 (0)，没有自动填充。
根因是 `user_documents` 表实际**没有 `updated_at` 列**，但解析 API 的 Supabase update 带了 `updated_at` 字段，PostgREST 会拒绝整条 update——导致 `ai_parsed` 永远不变成 `true`、`ai_summary` 永远不写入。同时 education/work insert 没有检查返回的 error 对象，任何插入失败都被静默吞掉，无法排查。

## What Changes

- **移除 `user_documents` update 中的 `updated_at` 字段**（该列不存在于生产数据库）
- **在 education_history / work_history insert 后检查 Supabase error**，失败时 console.error 并在返回的 JSON 中附带 warning
- **在 parse route 中对 ai_summary 字段写入前先 `JSON.stringify` 截断到安全长度**（防止超大文档导致 text 溢出）
- **给 education/work 插入添加 duplicate 防护**：同一 document_id 不会重复创建教育经历（用户多次点解析不会产生重复记录）
- **更新 `supabase/education-work-documents.sql`** 使其与生产 schema 一致（纯文档更新，不跑迁移）

## Capabilities

### New Capabilities

_无 — 本次是 bug fix，不引入新能力。_

### Modified Capabilities

_无现有 spec 的需求变更 — 这是实现层面的缺陷修复。_

## Impact

- **`app/api/user/documents/parse/route.ts`** — 主要修改文件：移除 `updated_at`、添加 insert error handling、添加去重逻辑
- **`app/api/user/documents/route.ts`** — 可能需要移除 `updated_at` 引用（如果有）
- **`supabase/education-work-documents.sql`** — 更新为实际 schema 以便后续开发不踩坑
- **不影响前端** — 前端 `loadEducation()` / `loadDocuments()` 逻辑不需要改，修完后端后自然生效
- **不影响其他 API** — education CRUD route 的列名已与生产 DB 一致
