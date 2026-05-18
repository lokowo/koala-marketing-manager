## ADDED Requirements

### Requirement: AI summary generation API
系统 SHALL 提供 `GET /api/professors/[id]/ai-summary` 端点，返回教授的 AI 生成中文简介。

#### Scenario: First request generates and caches
- **WHEN** 请求 AI 简介且 `professors.ai_summary` 为 null
- **THEN** 调用 Claude Haiku 生成 2-3 句中文简介，写回 `professors.ai_summary`，返回 `{ summary: "..." }`

#### Scenario: Subsequent request reads cache
- **WHEN** 请求 AI 简介且 `professors.ai_summary` 已有内容
- **THEN** 直接返回缓存内容，不调用 AI

#### Scenario: Generation failure
- **WHEN** Claude Haiku 调用失败
- **THEN** 返回 `{ summary: null, error: "生成失败" }` + HTTP 200（不阻塞页面）

### Requirement: AI summary content quality
AI 简介 SHALL 包含以下信息（如可用）：主要研究领域、学术成就亮点（H指数级别）、对 PhD 申请者的参考价值。

#### Scenario: Summary with full data
- **WHEN** 教授有 research_areas、h_index、grant_status
- **THEN** 简介覆盖研究领域、学术影响力、经费/招生信息

#### Scenario: Summary with minimal data
- **WHEN** 教授只有 name 和 university
- **THEN** 简介基于已知信息生成，不编造未知数据

### Requirement: AI summary database field
professors 表 SHALL 新增 `ai_summary TEXT` 字段用于缓存生成结果。

#### Scenario: Field added via migration
- **WHEN** 运行数据库迁移
- **THEN** professors 表新增 `ai_summary` 列，默认值 null，不影响现有数据
