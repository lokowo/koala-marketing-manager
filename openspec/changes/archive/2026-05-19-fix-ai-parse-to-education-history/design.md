## Context

AI 解析流程位于 `app/api/user/documents/parse/route.ts`，用 Claude Vision 识别上传文件，然后把结构化数据写入 `education_history` / `work_history` / `user_profiles` 三张表，同时把解析状态更新到 `user_documents`。

**当前代码 vs 生产 DB 不一致点：**

| 操作 | 代码写法 | 生产 DB 实际 |
|------|---------|-------------|
| `user_documents` update | 带 `updated_at` 字段 | 表里没有 `updated_at` 列 |
| `education_history` insert | 不检查 `.error` | 失败时静默吞掉 |
| `work_history` insert | 不检查 `.error` | 失败时静默吞掉 |
| 重复解析 | 无去重 | 同一文件多次解析会插入重复记录 |

`supabase/education-work-documents.sql` 中的 schema 定义也与生产 DB 不一致（用了 `school`/`degree`/`start_date` 等旧列名），仅文档层面的问题。

## Goals / Non-Goals

**Goals:**
- 用户点"AI解析"后教育经历能正常填充
- `user_documents.ai_parsed` 正确更新为 `true`
- `user_documents.ai_summary` 正确存入 Claude 返回的结构化数据
- 解析错误有日志可查（console.error + 返回 warnings）
- 同一文件重复解析不产生重复教育/工作记录
- SQL schema 文件与生产一致

**Non-Goals:**
- 不改 Claude 解析 prompt（当前 prompt 能正确识别学历证书）
- 不改前端 UI 或组件（前端代码已正确：先调 parse API，成功后刷新 education）
- 不改 education CRUD API（列名已与生产 DB 一致）
- 不做数据库 migration（生产 schema 是正确的，只同步 SQL 文件）
- 不处理历史已解析文档的回补（本次只修"解析不生效"的 bug）

## Decisions

### 1. 移除 `updated_at` 而非添加列

**选择：** 从代码中删除所有 `user_documents` update 里的 `updated_at` 字段。

**替代方案：** 在 `user_documents` 表加 `updated_at` 列。

**理由：** `user_documents` 表已有 `created_at`，文档记录很少被更新（只有解析时改 `ai_parsed`/`ai_summary`），加列带来的收益低于 schema 变更的风险。直接去掉代码里的无效字段最小化改动。

### 2. 用 `source_document_id` 或 `upsert` 去重

**选择：** 在插入前先查询 `education_history` 是否已有同一 `user_id` + `institution` + `degree_type` + `major` 的记录。如果有则 skip，没有才 insert。

**替代方案 A：** 在 `education_history` 表加 `source_document_id` 列做唯一约束去重。需要 DB migration，scope 过大。

**替代方案 B：** 解析前先删除该用户通过 AI 解析创建的所有教育记录再重新插入。可能误删用户手动编辑过的记录。

**理由：** 应用层去重最安全，不需要 DB 变更，不会删除用户手动数据。

### 3. Error handling 策略

**选择：** 每个 Supabase insert/update 检查 `{ error }`，失败时 `console.error` 并收集到 `warnings` 数组，最终在 API response 中返回。不中断整个解析流程（部分成功优于全部失败）。

**理由：** 解析一个文档可能提取出多条教育+工作经历，其中一条失败不应影响其他条的写入。前端已有刷新逻辑，能展示部分成功的数据。

### 4. SQL schema 文件同步

**选择：** 更新 `supabase/education-work-documents.sql` 使列名/类型与生产 DB 一致。

**理由：** 纯文档修正，防止后续开发者看 SQL 文件时被误导。不在生产执行。

## Risks / Trade-offs

- **[去重逻辑可能误判]** → 如果用户在两个不同学校读了同专业同学位（极少见），不会冲突因为 `institution` 不同。同一学校同学位同专业的重复记录才会被 skip。
- **[AI 解析返回非标准 JSON]** → 现有 regex 提取 `/{[\s\S]*}/` 已能处理 markdown 包裹的 JSON。如果 Claude 返回完全非 JSON，已有错误处理路径。不额外处理。
- **[并发解析]** → 用户快速连点两次"AI解析"可能产生竞态。风险极低（按钮在 parsing 状态时已禁用），不额外处理。
